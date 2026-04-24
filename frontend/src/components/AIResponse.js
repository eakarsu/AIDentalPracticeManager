import React from 'react';
import ReactMarkdown from 'react-markdown';

function AIResponse({ content, model, usage, title }) {
  if (!content) return null;

  return (
    <div className="ai-response">
      <div className="ai-response-header">
        <div className="ai-icon">🤖</div>
        <div>
          <h4>{title || 'AI Analysis'}</h4>
          <div className="ai-meta">
            {model && <span>Model: {model}</span>}
            {usage && <span> | Tokens: {usage.total_tokens}</span>}
          </div>
        </div>
      </div>
      <div className="ai-response-content">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

export default AIResponse;
