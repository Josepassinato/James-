// components/AddKnowledgeModal.tsx
import React, { useState } from 'react';
import { X, UploadCloud, LoaderCircle, Link as LinkIcon } from 'lucide-react';
import { KnowledgeCategory, KnowledgeItem } from '../types';

interface AddKnowledgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (category: KnowledgeCategory, item: Omit<KnowledgeItem, 'id'>) => void;
    isProcessing: boolean;
    onFileUpload: (file: File) => void;
    onUrlSubmit: (url: string) => void;
}

const categories: { value: KnowledgeCategory, label: string }[] = [
    { value: 'personal', label: 'Pessoal' },
    { value: 'professional', label: 'Profissional' },
    { value: 'goals', label: 'Metas' },
    { value: 'misc', label: 'Diversos' },
];

export const AddKnowledgeModal: React.FC<AddKnowledgeModalProps> = ({ isOpen, onClose, onSave, isProcessing, onFileUpload, onUrlSubmit }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<KnowledgeCategory>('misc');
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    if (!isOpen) {
        return null;
    }

    const clearForm = () => {
        setTitle('');
        setContent('');
        setCategory('misc');
        setUrl('');
        setError('');
    };

    const handleSave = () => {
        if (!title.trim() || !content.trim()) {
            setError('Título e conteúdo são obrigatórios para salvar manualmente.');
            return;
        }
        onSave(category, { title, content });
        clearForm();
        onClose();
    };
    
    const handleUrlAnalysis = () => {
        if (!url.trim() || !url.startsWith('http')) {
            setError('Por favor, insira um URL válido.');
            return;
        }
        onUrlSubmit(url);
        clearForm();
    };

    const handleClose = () => {
        clearForm();
        onClose();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileUpload(file);
        }
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type === 'application/pdf') {
            onFileUpload(file);
        } else {
            setError('Por favor, solte apenas arquivos PDF.');
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
            onClick={handleClose}
        >
            <div 
                className="bg-bg-light rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 md:p-8 border-b border-bg-lighter flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-text-primary">Alimentar Memória</h2>
                     <button 
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-bg-lighter transition-colors"
                        disabled={isProcessing}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
                   {isProcessing ? (
                       <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                           <LoaderCircle size={40} className="animate-spin text-brand-primary mb-4" />
                           <p className="font-semibold text-text-primary">Analisando fonte de dados...</p>
                           <p className="text-sm text-text-secondary">James está lendo e extraindo as informações chave.</p>
                       </div>
                   ) : (
                       <>
                           {/* Manual Input */}
                           <div>
                                <label htmlFor="knowledge-title" className="block text-sm font-medium text-text-secondary mb-2">
                                    Título
                                </label>
                                <input
                                    id="knowledge-title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-3 bg-bg-main border border-bg-lighter rounded-md focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
                                    placeholder="Ex: Contatos de Emergência"
                                />
                           </div>
                           <div>
                                <label htmlFor="knowledge-category" className="block text-sm font-medium text-text-secondary mb-2">
                                    Categoria
                                </label>
                                <select
                                    id="knowledge-category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
                                    className="w-full p-3 bg-bg-main border border-bg-lighter rounded-md focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
                                >
                                    {categories.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                           </div>
                           <div>
                                <label htmlFor="knowledge-content" className="block text-sm font-medium text-text-secondary mb-2">
                                    Conteúdo
                                </label>
                                <textarea
                                    id="knowledge-content"
                                    rows={4}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full p-3 bg-bg-main border border-bg-lighter rounded-md focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
                                    placeholder="Adicione a informação detalhada aqui..."
                                />
                           </div>
                           <div className="flex justify-end">
                             <button
                                onClick={handleSave}
                                disabled={isProcessing}
                                className="px-6 py-2 rounded-md bg-brand-primary text-white font-semibold hover:bg-brand-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Salvar Manualmente
                            </button>
                           </div>
                           
                           <div className="relative flex py-2 items-center">
                               <div className="flex-grow border-t border-bg-lighter"></div>
                               <span className="flex-shrink mx-4 text-text-secondary text-xs font-semibold">OU</span>
                               <div className="flex-grow border-t border-bg-lighter"></div>
                           </div>

                           {/* URL Input */}
                           <div>
                                <label htmlFor="knowledge-url" className="block text-sm font-medium text-text-secondary mb-2">
                                    Analisar a partir de um Link
                                </label>
                                <div className="flex space-x-2">
                                <input
                                    id="knowledge-url"
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="flex-grow p-3 bg-bg-main border border-bg-lighter rounded-md focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
                                    placeholder="https://meu-site.com ou https://linkedin.com/in/..."
                                />
                                <button
                                    onClick={handleUrlAnalysis}
                                    className="p-3 rounded-md bg-brand-secondary text-white font-semibold hover:bg-blue-500 transition disabled:opacity-50"
                                    title="Analisar Link"
                                >
                                    <LinkIcon size={20}/>
                                </button>
                                </div>
                           </div>

                           <div className="relative flex py-2 items-center">
                               <div className="flex-grow border-t border-bg-lighter"></div>
                               <span className="flex-shrink mx-4 text-text-secondary text-xs font-semibold">OU</span>
                               <div className="flex-grow border-t border-bg-lighter"></div>
                           </div>
                           
                           {/* PDF Upload */}
                           <div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileSelect}
                                    accept=".pdf"
                                    className="hidden" 
                                />
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`mt-2 flex justify-center items-center flex-col w-full h-32 px-6 transition-colors border-2 border-dashed rounded-md cursor-pointer
                                        ${isDragging ? 'border-brand-primary bg-bg-main' : 'border-bg-lighter hover:border-text-secondary'}`}
                                >
                                    <UploadCloud size={32} className="text-text-secondary mb-2" />
                                    <p className="text-sm text-text-secondary text-center">
                                        <span className="font-semibold text-brand-secondary">Clique para carregar</span> ou arraste e solte um PDF
                                    </p>
                                </div>
                           </div>

                           {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                       </>
                   )}
                </div>

                 <div className="p-6 mt-auto border-t border-bg-lighter flex justify-end">
                     <button
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-md text-text-secondary hover:bg-bg-lighter transition disabled:opacity-50"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};