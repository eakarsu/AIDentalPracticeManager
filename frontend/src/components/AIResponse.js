import React from 'react';
import AIReport from './AIReport';

function AIResponse({ content, model, usage, title }) {
  return <AIReport response={content} model={model} tokens={usage} title={title || 'AI Analysis'} />;
}

export default AIResponse;
