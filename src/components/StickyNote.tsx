
import React from 'react';

interface StickyNoteProps {
  content: string;
  author: string;
  onEdit?: () => void;
  editable?: boolean;
}

const StickyNote: React.FC<StickyNoteProps> = ({ content, author, onEdit, editable = false }) => {
  return (
    <div className="sticky-note animate-fade-in mb-6">
      <p className="text-couples-text mb-3">{content || `No note from ${author} yet.`}</p>
      <div className="flex justify-between items-center">
        <p className="text-sm text-couples-text/70">From {author}</p>
        {editable && (
          <button 
            onClick={onEdit} 
            className="text-sm text-couples-accent hover:underline"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
};

export default StickyNote;
