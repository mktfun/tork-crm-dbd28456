
import { X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileAttachmentProps {
    file: File;
    onRemove: () => void;
    isUploading: boolean;
    uploadProgress?: number;
}

export function FileAttachment({ file, onRemove, isUploading, uploadProgress }: FileAttachmentProps) {
    const isImage = file.type.startsWith('image/');

    return (
        <div className={cn(
            "flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10",
            "animate-in fade-in slide-in-from-bottom-2 duration-200",
            "w-fit max-w-[250px]"
        )}>
            <div className="h-10 w-10 rounded-md bg-white/10 flex items-center justify-center shrink-0 overflow-hidden relative">
                {isImage ? (
                    <img
                        src={URL.createObjectURL(file)}
                        alt="Preview"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <FileText className="h-5 w-5 text-primary" />
                )}

                {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
                <p className="text-xs font-medium text-foreground truncate max-w-[12ch]">
                    {file.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                    {(file.size / 1024).toFixed(0)}KB
                </p>
            </div>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-1"
                onClick={onRemove}
                disabled={isUploading}
            >
                <X className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}
