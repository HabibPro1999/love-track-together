
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Copy } from 'lucide-react';

const ConnectPartner = () => {
  const [method, setMethod] = useState<'code' | 'search'>('code');
  const [partnerCode, setPartnerCode] = useState('');
  const [partnerUsername, setPartnerUsername] = useState('');
  const [yourCode] = useState('LV27B39'); // Demo generated code
  const navigate = useNavigate();

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would verify the code or search for the username
    // For demo purposes, we'll just navigate to home
    navigate('/home');
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(yourCode);
    // Would show a toast here in a real app
  };

  return (
    <div className="app-container flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm mt-12">
        <div className="text-center mb-8 animate-slide-up">
          <div className="flex justify-center mb-4">
            <div className="bg-couples-accent p-3 rounded-full inline-flex">
              <Heart className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Connect with Partner</h1>
          <p className="text-couples-text/70 mt-2">
            Link your account with your partner to start sharing habits
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
          <div className="flex justify-center space-x-4 mb-6">
            <button
              onClick={() => setMethod('code')}
              className={`px-4 py-2 rounded-full ${
                method === 'code' 
                  ? 'bg-couples-accent text-white' 
                  : 'bg-couples-backgroundAlt text-couples-text'
              }`}
            >
              Use Code
            </button>
            <button
              onClick={() => setMethod('search')}
              className={`px-4 py-2 rounded-full ${
                method === 'search' 
                  ? 'bg-couples-accent text-white' 
                  : 'bg-couples-backgroundAlt text-couples-text'
              }`}
            >
              Search
            </button>
          </div>

          {method === 'code' ? (
            <div className="space-y-4">
              <div className="bg-couples-backgroundAlt p-4 rounded-lg text-center">
                <p className="text-sm text-couples-text/70 mb-2">Your partner code</p>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-xl font-medium">{yourCode}</span>
                  <button 
                    onClick={copyCodeToClipboard}
                    className="text-couples-accent hover:text-couples-accent/80"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleConnect}>
                <label htmlFor="partnerCode" className="block text-sm font-medium mb-1">
                  Enter your partner's code
                </label>
                <input
                  type="text"
                  id="partnerCode"
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value)}
                  className="input-field"
                  placeholder="Enter code (e.g. AB12C34)"
                />
                
                <button 
                  type="submit" 
                  className="button-primary w-full mt-4"
                  disabled={!partnerCode}
                >
                  Connect
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label htmlFor="partnerUsername" className="block text-sm font-medium mb-1">
                  Search by name or email
                </label>
                <input
                  type="text"
                  id="partnerUsername"
                  value={partnerUsername}
                  onChange={(e) => setPartnerUsername(e.target.value)}
                  className="input-field"
                  placeholder="John or john@example.com"
                />
              </div>
              
              <button 
                type="submit" 
                className="button-primary w-full"
                disabled={!partnerUsername}
              >
                Search & Connect
              </button>
            </form>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-couples-text/70">
            Skip for now and{' '}
            <button 
              onClick={() => navigate('/home')} 
              className="text-couples-accent hover:underline"
            >
              continue without a partner
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectPartner;
