-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'viewer', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for multi-tenant access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  average_consumption NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create property_access table for sharing access
CREATE TABLE public.property_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  access_level app_role NOT NULL DEFAULT 'viewer',
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (property_id, user_id)
);

-- Create solar_systems table
CREATE TABLE public.solar_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  number_of_modules INTEGER NOT NULL,
  module_power_watts NUMERIC NOT NULL,
  module_brand TEXT,
  inverter_brand TEXT,
  inverter_power_watts NUMERIC,
  installation_year INTEGER NOT NULL,
  system_cost NUMERIC,
  last_maintenance_date DATE,
  expected_monthly_generation NUMERIC GENERATED ALWAYS AS (
    (number_of_modules * module_power_watts * 30 * 4.5) / 1000
  ) STORED,
  total_power_kw NUMERIC GENERATED ALWAYS AS (
    (number_of_modules * module_power_watts) / 1000
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bill_analyses table
CREATE TABLE public.bill_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  solar_system_id UUID REFERENCES public.solar_systems(id) ON DELETE SET NULL,
  reference_month INTEGER NOT NULL CHECK (reference_month >= 1 AND reference_month <= 12),
  reference_year INTEGER NOT NULL,
  
  -- Bill file
  bill_file_url TEXT,
  
  -- User input
  monitored_generation_kwh NUMERIC NOT NULL,
  
  -- Extracted data from OCR
  account_holder TEXT,
  account_number TEXT,
  distributor TEXT,
  
  -- Energy data
  billed_consumption_kwh NUMERIC,
  injected_energy_kwh NUMERIC,
  compensated_energy_kwh NUMERIC,
  previous_credits_kwh NUMERIC,
  current_credits_kwh NUMERIC,
  
  -- Financial data
  total_amount NUMERIC,
  energy_cost NUMERIC,
  availability_cost NUMERIC,
  public_lighting_cost NUMERIC,
  icms_cost NUMERIC,
  pis_cofins_cost NUMERIC,
  tariff_flag TEXT,
  fine_amount NUMERIC DEFAULT 0,
  
  -- Calculated fields
  real_consumption_kwh NUMERIC,
  expected_generation_kwh NUMERIC,
  generation_efficiency NUMERIC,
  estimated_savings NUMERIC,
  
  -- Analysis
  ai_analysis TEXT,
  alerts JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE (property_id, reference_month, reference_year)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_analyses ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check property access
CREATE OR REPLACE FUNCTION public.has_property_access(_user_id UUID, _property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties WHERE id = _property_id AND owner_id = _user_id
    UNION
    SELECT 1 FROM public.property_access WHERE property_id = _property_id AND user_id = _user_id
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Properties policies
CREATE POLICY "Users can view owned properties"
  ON public.properties FOR SELECT
  USING (owner_id = auth.uid() OR public.has_property_access(auth.uid(), id));

CREATE POLICY "Users can insert own properties"
  ON public.properties FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own properties"
  ON public.properties FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own properties"
  ON public.properties FOR DELETE
  USING (owner_id = auth.uid());

-- Property access policies
CREATE POLICY "Owners can view property access"
  ON public.property_access FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can grant property access"
  ON public.property_access FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can revoke property access"
  ON public.property_access FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
  );

-- Solar systems policies
CREATE POLICY "Users can view solar systems"
  ON public.solar_systems FOR SELECT
  USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Owners can insert solar systems"
  ON public.solar_systems FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can update solar systems"
  ON public.solar_systems FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can delete solar systems"
  ON public.solar_systems FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
  );

-- Bill analyses policies
CREATE POLICY "Users can view bill analyses"
  ON public.bill_analyses FOR SELECT
  USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Users with access can insert bill analyses"
  ON public.bill_analyses FOR INSERT
  WITH CHECK (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Users with access can update bill analyses"
  ON public.bill_analyses FOR UPDATE
  USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Owners can delete bill analyses"
  ON public.bill_analyses FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solar_systems_updated_at
  BEFORE UPDATE ON public.solar_systems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bill_analyses_updated_at
  BEFORE UPDATE ON public.bill_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for bills
INSERT INTO storage.buckets (id, name, public) VALUES ('bills', 'bills', false);

-- Storage policies for bills bucket
CREATE POLICY "Users can upload their bills"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bills' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their bills"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bills' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their bills"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'bills' AND auth.uid()::text = (storage.foldername(name))[1]);