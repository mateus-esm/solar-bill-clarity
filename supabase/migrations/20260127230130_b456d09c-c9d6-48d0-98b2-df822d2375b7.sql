-- Update stuck analyses (processing for more than 10 minutes) to error status
UPDATE bill_analyses 
SET status = 'error', 
    ai_analysis = 'Análise travada - timeout. Por favor, tente novamente.'
WHERE status = 'processing' 
  AND created_at < NOW() - INTERVAL '10 minutes';