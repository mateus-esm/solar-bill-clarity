import { useState, useCallback } from "react";
import { Upload, X, Image } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BillUploadProps {
  onFileSelect: (file: File) => void;
  file: File | null;
  onClear: () => void;
}

export function BillUpload({ onFileSelect, file, onClear }: BillUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFile = e.dataTransfer.files[0];
        if (isValidFileType(droppedFile)) {
          onFileSelect(droppedFile);
        }
      }
    },
    [onFileSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const isValidFileType = (file: File) => {
    // Accept images and PDFs (PDFs are converted to images client-side)
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];
    return validTypes.includes(file.type) || file.name.toLowerCase().endsWith(".pdf");
  };

  const getFileIcon = () => {
    return <Image className="h-8 w-8 text-primary" />;
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.label
            key="upload-zone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`upload-zone flex flex-col items-center justify-center gap-4 ${
              isDragging ? "dragging" : ""
            }`}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={handleFileInput}
              className="hidden"
            />
            <motion.div
              animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
              className="rounded-full bg-primary/10 p-4"
            >
              <Upload className="h-8 w-8 text-primary" />
            </motion.div>
            <div className="text-center">
              <p className="text-base font-medium text-foreground">
                Arraste sua conta de energia aqui
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                ou clique para selecionar (JPG, PNG, PDF)
              </p>
            </div>
          </motion.label>
        ) : (
          <motion.div
            key="file-preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="stat-card flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                {getFileIcon()}
              </div>
              <div>
                <p className="font-medium text-foreground line-clamp-1">
                  {file.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={onClear}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
