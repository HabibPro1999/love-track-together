
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

const ConnectPartner = () => {
  const [method, setMethod] = useState<'code' | 'search'>('code');
  const [partnerCode, setPartnerCode] = useState('');
  const [partnerUsername, setPartnerUsername] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const generateOwnCode = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Logged In",
        description: "Please log in to generate a connection code"
      });
      return;
    }

    try {
      // Call the Supabase function to create a couple and generate a code
      const { data, error } = await supabase.rpc('create_couple_with_code');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const coupleId = data[0].couple_id;
        const code = data[0].code;

        // Add current user to the couple
        const { error: memberError } = await supabase
          .from('couple_members')
          .insert({
            couple_id: coupleId,
            user_id: user.id
          });

        if (memberError) throw memberError;

        setGeneratedCode(code);
        toast({
          title: "Code Generated",
          description: `Your connection code is ${code}`
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Generating Code",
        description: "Failed to generate connection code"
      });
      console.error(error);
    }
  };

  const connectWithPartnerCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Logged In",
        description: "Please log in to connect with a partner"
      });
      return;
    }

    try {
      // Check if the code exists
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('id')
        .eq('code', partnerCode)
        .single();

      if (coupleError) throw coupleError;

      if (!coupleData) {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description: "The partner code you entered does not exist"
        });
        return;
      }

      // Add current user to the existing couple
      const { error: memberError } = await supabase
        .from('couple_members')
        .insert({
          couple_id: coupleData.id,
          user_id: user.id
        });

      if (memberError) throw memberError;

      toast({
        title: "Connected",
        description: "Successfully connected with your partner"
      });

      navigate('/home');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect with partner"
      });
      console.error(error);
    }
  };

  const copyCodeToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast({
        title: "Code Copied",
        description: "Your connection code has been copied to clipboard"
      });
    }
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
                <p className="text-sm text-couples-text/70 mb-2">
                  {generatedCode ? 'Your partner code' : 'Generate your code'}
                </p>
                <div className="flex items-center justify-center space-x-2">
                  {generatedCode ? (
                    <>
                      <span className="text-xl font-medium">{generatedCode}</span>
                      <button 
                        onClick={copyCodeToClipboard}
                        className="text-couples-accent hover:text-couples-accent/80"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <Button 
                      onClick={generateOwnCode}
                      variant="secondary"
                      className="w-full"
                    >
                      Generate Code
                    </Button>
                  )}
                </div>
              </div>
              
              <form onSubmit={connectWithPartnerCode}>
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
            <form onSubmit={connectWithPartnerCode} className="space-y-4">
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
