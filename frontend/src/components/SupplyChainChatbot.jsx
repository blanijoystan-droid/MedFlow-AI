import { useEffect, useRef, useState } from 'react';
import { Bot, LoaderCircle, MessageCircle, Send, X } from 'lucide-react';
import './SupplyChainChatbot.css';

const SUGGESTED_QUESTIONS = [
  'Which hospital has the highest shortage risk?',
  'What was the last trade approved?',
  'How many units have been reallocated?',
];

const OFFLINE_MESSAGE = 'Assistant is offline. Please check the backend connection.';

export default function SupplyChainChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendQuestion = async (question = input) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isLoading) return;

    setMessages((current) => [...current, { role: 'user', text: trimmedQuestion }]);
    setInput('');
    setIsLoading(true);

    try {
      let response;
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: trimmedQuestion }),
        });
      } catch (err) {
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          response = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: trimmedQuestion }),
          });
        } else {
          throw err;
        }
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'The assistant could not process your question.');
      }
      setMessages((current) => [
        ...current,
        { role: 'assistant', text: data.response },
      ]);
    } catch (error) {
      const message = error instanceof TypeError ? OFFLINE_MESSAGE : error.message;
      setMessages((current) => [...current, { role: 'assistant', text: message, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendQuestion();
  };

  return (
    <div className="supply-chat">
      {isOpen && (
        <section
          className="supply-chat__window"
          aria-label="MedFlow-AI Assistant chat"
          aria-live="polite"
        >
          <header className="supply-chat__header">
            <div className="supply-chat__identity">
              <span className="supply-chat__avatar"><Bot size={19} /></span>
              <div>
                <h2>MedFlow-AI Assistant</h2>
                <span>Read-only supply chain insights</span>
              </div>
            </div>
            <button
              className="supply-chat__close"
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <X size={19} />
            </button>
          </header>

          <div className="supply-chat__messages" role="log" aria-label="Chat messages">
            {messages.length === 0 && (
              <div className="supply-chat__welcome">
                <span className="supply-chat__welcome-icon"><Bot size={22} /></span>
                <strong>Ask about your supply network</strong>
                <p>I can answer using the current hospital and trade data.</p>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                className={`supply-chat__message supply-chat__message--${message.role}${message.isError ? ' supply-chat__message--error' : ''}`}
                key={`${message.role}-${index}`}
              >
                {message.text}
              </div>
            ))}
            {isLoading && (
              <div className="supply-chat__loading" role="status" aria-label="Assistant is responding">
                <LoaderCircle size={17} className="supply-chat__spinner" />
                <span>Thinking…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="supply-chat__suggestions">
            <span>Suggested Questions</span>
            <div className="supply-chat__chips">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  className="supply-chat__chip"
                  type="button"
                  key={question}
                  onClick={() => sendQuestion(question)}
                  disabled={isLoading}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          <form className="supply-chat__composer" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about hospital inventory…"
              aria-label="Ask a question"
              disabled={isLoading}
            />
            <button
              className="supply-chat__send"
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || isLoading}
            >
              <Send size={17} />
            </button>
          </form>
        </section>
      )}

      <button
        className={`supply-chat__toggle${isOpen ? ' supply-chat__toggle--open' : ''}`}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close assistant chat' : 'Open assistant chat'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={23} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
