import { useState, useCallback } from "react";
import { Plus, Upload, X, Image } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BillUploadProps {
  onFileSelect?: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  file?: File | null;
  files?: File[];
  onClear?: () => void;
  multiple?: boolean;
}

export function BillUpload({ onFileSelect, onFilesSelect, file, files = [], onClear, multiple = false }: BillUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const selectedFiles = multiple ? files : file ? [file] : [];

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
        const validFiles = Array.from(e.dataTransfer.files).filter(isValidFileType);
        if (validFiles.length > 0) {
          if (multiple) {
            onFilesSelect?.(validFiles);
          } else {
            onFileSelect?.(validFiles[0]);
          }
        }
      }
    },
    [multiple, onFileSelect, onFilesSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files).filter(isValidFileType);
      if (multiple) {
        onFilesSelect?.(validFiles);
      } else if (validFiles[0]) {
        onFileSelect?.(validFiles[0]);
      }
      e.target.value = "";
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
        {selectedFiles.length === 0 ? (
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
              multiple={multiple}
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
                {multiple ? "Arraste suas contas de energia aqui" : "Arraste sua conta de energia aqui"}
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
            className="stat-card space-y-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  {getFileIcon()}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 font-medium text-foreground">
                    {selectedFiles.length > 1 ? `${selectedFiles.length} contas selecionadas` : selectedFiles[0]?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFiles.reduce((sum, selectedFile) => sum + selectedFile.size, 0) / 1024 / 1024).toFixed(2)} MB no total
                  </p>
                </div>
              </div>
              {onClear && (
                <button
                  onClick={onClear}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {multiple && (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15">
                <Plus className="h-4 w-4" />
                Adicionar mais contas
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
