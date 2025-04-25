import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Copy, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast as sonnerToast } from "sonner"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ConnectPartner = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'useCode'>('generate');
  const [partnerCode, setPartnerCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: existingCoupleData, isLoading: isLoadingExistingCode } = useQuery({
    queryKey: ['existingCoupleCode', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: memberData } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!memberData) return null;

      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('code')
        .eq('id', memberData.couple_id)
        .single();

      if (coupleError) {
        console.error('Error fetching existing couple code:', coupleError);
        return null;
      }
      return coupleData;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (existingCoupleData?.code) {
      setGeneratedCode(existingCoupleData.code);
    }
  }, [existingCoupleData]);

  const generateOwnCode = async () => {
    if (!user) {
      sonnerToast.error("Not Logged In", { description: "Please log in first." });
      return;
    }
    if (generatedCode) return;

    setIsGeneratingCode(true);
    try {
      const { data, error } = await supabase.rpc('create_couple_with_code');

      if (error) throw error;

      if (data && data.length > 0) {
        const coupleId = data[0].couple_id;
        const code = data[0].code;

        const { error: memberError } = await supabase
          .from('couple_members')
          .insert({ couple_id: coupleId, user_id: user.id })
          .select();

        if (memberError?.message.includes('check constraint') || memberError?.message.includes('security policy')) {
          sonnerToast.error("Permission Denied", {
            description: "Could not add you to the couple. Please check permissions."
          });
          await supabase.from('couples').delete().eq('id', coupleId);
          return;
        } else if (memberError) {
          if (memberError.code === '23505') {
            sonnerToast.info("Already Connected", { description: "You seem to be already part of a couple." });
            queryClient.invalidateQueries({ queryKey: ['existingCoupleCode', user?.id] });
          } else {
            throw memberError;
          }
        }

        if (!memberError) {
          setGeneratedCode(code);
          sonnerToast.success("Code Generated!", { description: `Your connection code is ${code}` });
          queryClient.invalidateQueries({ queryKey: ['existingCoupleCode', user?.id] });
        }
      }
    } catch (error: any) {
      sonnerToast.error("Error Generating Code", {
        description: error?.message || "Failed to generate connection code."
      });
      console.error(error);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const connectWithPartnerCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      sonnerToast.error("Not Logged In", { description: "Please log in first." });
      return;
    }
    if (!partnerCode.trim()) {
      sonnerToast.warning("Input Required", { description: "Please enter your partner's code." });
      return;
    }

    setIsConnecting(true);
    try {
      const { data: existingMemberData } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMemberData) {
        sonnerToast.info("Already Connected", { description: "You are already connected with a partner." });
        navigate('/home');
        return;
      }

      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('id')
        .eq('code', partnerCode.trim().toUpperCase())
        .maybeSingle();

      if (coupleError) throw coupleError;

      if (!coupleData) {
        sonnerToast.error("Invalid Code", { description: "The partner code you entered does not exist." });
        return;
      }

      const { error: memberError } = await supabase
        .from('couple_members')
        .insert({ couple_id: coupleData.id, user_id: user.id })
        .select();

      if (memberError?.code === '23505') {
        sonnerToast.info("Already Connected", { description: "You are already connected to this partner.", });
        navigate('/home');
        return;
      } else if (memberError) {
        throw memberError;
      }

      sonnerToast.success("Connected!", { description: "Successfully connected with your partner." });
      queryClient.invalidateQueries({ queryKey: ['coupleMembership', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['partnerMembership'] });
      queryClient.invalidateQueries({ queryKey: ['partnerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['existingCoupleCode', user?.id] });

      navigate('/home');
    } catch (error: any) {
      sonnerToast.error("Connection Error", {
        description: error?.message || "Failed to connect with partner."
      });
      console.error(error);
    } finally {
      setIsConnecting(false);
    }
  };

  const copyCodeToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      sonnerToast.info("Code Copied", { description: "Connection code copied to clipboard." });
    }
  };

  if (isLoadingExistingCode) {
    return (
      <div className="app-container flex flex-col items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-couples-accent" />
      </div>
    );
  }

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
            <Button
              variant={activeTab === 'generate' ? 'default' : 'outline'}
              onClick={() => setActiveTab('generate')}
              className={`rounded-full ${activeTab === 'generate' ? 'bg-couples-accent text-white hover:bg-couples-accent/90' : ''}`}
            >
              Generate
            </Button>
            <Button
              variant={activeTab === 'useCode' ? 'default' : 'outline'}
              onClick={() => setActiveTab('useCode')}
              className={`rounded-full ${activeTab === 'useCode' ? 'bg-couples-accent text-white hover:bg-couples-accent/90' : ''}`}
            >
              Use Code
            </Button>
          </div>

          {activeTab === 'generate' && (
            <div className="space-y-4">
              <div className="bg-couples-backgroundAlt p-4 rounded-lg text-center">
                <p className="text-sm text-couples-text/70 mb-2">
                  {generatedCode ? 'Your connection code' : 'Generate a code to share'}
                </p>
                <div className="flex items-center justify-center space-x-2 h-10">
                  {generatedCode ? (
                    <>
                      <span className="text-xl font-medium tracking-widest">{generatedCode}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={copyCodeToClipboard}
                        className="text-couples-accent hover:text-couples-accent/80"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={generateOwnCode}
                      disabled={isGeneratingCode}
                      className="w-full"
                    >
                      {isGeneratingCode ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                      ) : (
                        'Generate Code'
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-center text-couples-text/60 px-4">
                Share this code with your partner. They can enter it in the "Use Code" tab.
              </p>
            </div>
          )}

          {activeTab === 'useCode' && (
            <form onSubmit={connectWithPartnerCode} className="space-y-4">
              <div>
                <Label htmlFor="partnerCode" className="block text-sm font-medium mb-1">
                  Enter your partner's code
                </Label>
                <Input
                  type="text"
                  id="partnerCode"
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value)}
                  className="input-field text-center tracking-widest"
                  placeholder="ABCDEF"
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect="off"
                />
              </div>
              <Button
                type="submit"
                className="button-primary w-full"
                disabled={!partnerCode || isConnecting}
              >
                {isConnecting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</>
                ) : (
                  'Connect'
                )}
              </Button>
            </form>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-couples-text/70">
            {generatedCode ? 'Connected?' : 'Want to skip for now?'}{' '}
            <Button
              variant="link"
              onClick={() => navigate('/home')}
              className="text-couples-accent hover:underline p-1 h-auto"
            >
              Go to Home
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectPartner;
