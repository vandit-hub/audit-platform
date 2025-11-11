import { useState, useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from "./ui/v2/badge";
import { Input } from './ui/v2/input';

interface MultiSelectInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}

export function MultiSelectInput({ values, onChange, placeholder, suggestions = [] }: MultiSelectInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!values.includes(inputValue.trim())) {
        onChange([...values, inputValue.trim()]);
      }
      setInputValue('');
      setShowSuggestions(false);
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const removeValue = (valueToRemove: string) => {
    onChange(values.filter(v => v !== valueToRemove));
  };

  const addSuggestion = (suggestion: string) => {
    if (!values.includes(suggestion)) {
      onChange([...values, suggestion]);
    }
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(inputValue.toLowerCase()) && !values.includes(s)
  );

  return (
    <div className="relative">
      <div 
        className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] cursor-text"
        style={{ borderColor: 'var(--border-color-regular)' }}
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((value, index) => (
          <Badge 
            key={index} 
            variant="secondary" 
            className="gap-1 pl-2 pr-1"
            style={{ background: 'var(--c-palUiBlu100)', color: 'var(--c-palUiBlu600)' }}
          >
            {value}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeValue(value);
              }}
              className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(e.target.value.length > 0);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm placeholder:text-gray-400"
          style={{ color: 'var(--c-texPri)' }}
        />
      </div>
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div 
          className="absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-48 overflow-y-auto"
          style={{ 
            background: 'white',
            backgroundColor: 'white',
            borderColor: 'var(--border-color-regular)'
          }}
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => addSuggestion(suggestion)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
              style={{ 
                color: 'var(--c-texPri)',
                backgroundColor: 'transparent'
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
