import React, { useState, useEffect } from 'react';
import { Share2, Youtube, Instagram, UploadCloud, Copy, Check, ExternalLink, Globe, Lock, Send, Smartphone, Loader2, Sparkles, Key, CheckCircle2, LogOut, Info, HelpCircle } from 'lucide-react';

interface SocialUploadHubProps {
  videoBlob: Blob | null;
  videoUrl: string;
  title: string;
  surahName: string;
  reciterName: string;
  aspectRatio: string;
}

export const SocialUploadHub: React.FC<SocialUploadHubProps> = ({
  videoBlob,
  videoUrl,
  title,
  surahName,
  reciterName,
  aspectRatio
}) => {
  const [activeTab, setActiveTab] = useState<'webshare' | 'youtube' | 'instagram'>('webshare');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  // YouTube Upload Form state
  const [ytTitle, setYtTitle] = useState(`${title} | Beautiful Quran Recitation #Shorts`);
  const [ytDescription, setYtDescription] = useState(
    `Listen to heart-touching recitation of Surah ${surahName} recited by ${reciterName}.\n\n✨ "Verily, in the remembrance of Allah do hearts find rest." (13:28)\n\n#Quran #Shorts #Surah${surahName.replace(/[^a-zA-Z]/g, '')} #QuranRecitation #Islam #Tilawat #IslamicReminder`
  );
  const [ytPrivacy, setYtPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');

  // OAuth token state (saved in localStorage for seamless reuse)
  const [ytAccessToken, setYtAccessToken] = useState<string>(() => {
    return localStorage.getItem('yt_oauth_access_token') || '';
  });
  const [clientId, setClientId] = useState<string>(() => {
    return localStorage.getItem('yt_google_client_id') || '';
  });
  const [showAdvancedKey, setShowAdvancedKey] = useState(false);

  const [isUploadingYt, setIsUploadingYt] = useState(false);
  const [ytUploadProgress, setYtUploadProgress] = useState(0);
  const [ytSuccessUrl, setYtSuccessUrl] = useState<string | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);

  const isShortsFormat = aspectRatio === '9:16';

  // Save token changes
  useEffect(() => {
    if (ytAccessToken) {
      localStorage.setItem('yt_oauth_access_token', ytAccessToken);
    } else {
      localStorage.removeItem('yt_oauth_access_token');
    }
  }, [ytAccessToken]);

  useEffect(() => {
    if (clientId) {
      localStorage.setItem('yt_google_client_id', clientId);
    }
  }, [clientId]);

  // Handle Google OAuth Popup for 1-Click "Connect YouTube Account"
  const handleConnectYouTubeOAuth = () => {
    const defaultClientId = clientId.trim() || '826620938647-sample.apps.googleusercontent.com';
    const redirectUri = window.location.origin;
    const scope = 'https://www.googleapis.com/auth/youtube.upload';

    // Google OAuth 2.0 Implicit Grant auth URL
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(defaultClientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(scope)}` +
      `&include_granted_scopes=true` +
      `&prompt=select_account`;

    const popup = window.open(authUrl, 'Connect YouTube Account', 'width=600,height=700');

    if (!popup) {
      alert('Popup blocker prevented opening Google Sign-In. Please allow popups or use manual token below.');
      return;
    }

    // Interval to poll popup location or token hash if returned to same domain
    const timer = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(timer);
          return;
        }
        if (popup.location.href.includes('access_token=')) {
          const hash = popup.location.hash || popup.location.search;
          const params = new URLSearchParams(hash.replace('#', '?'));
          const token = params.get('access_token');
          if (token) {
            setYtAccessToken(token);
            setYtError(null);
            popup.close();
            clearInterval(timer);
          }
        }
      } catch (e) {
        // Cross-origin check while on google.com - expected
      }
    }, 500);
  };

  const handleDisconnect = () => {
    setYtAccessToken('');
    localStorage.removeItem('yt_oauth_access_token');
  };

  // 1. Web Share API for direct mobile/desktop app selection (Instagram Reels, TikTok, WhatsApp, etc.)
  const triggerDownloadFallback = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDirectWebShare = async () => {
    if (!videoBlob && !videoUrl) return;

    setShareNotice(null);
    const shareText = `Watch ${title} - Recited by ${reciterName} ✨\n\n#Quran #Islam #Tilawat #QuranRecitation`;

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        const file = videoBlob
          ? new File([videoBlob], `${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`, { type: 'video/mp4' })
          : null;

        const canShareFiles = file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

        if (canShareFiles && file) {
          await navigator.share({
            title: title,
            text: shareText,
            files: [file]
          });
          return;
        } else {
          // Fallback share without file parameter
          await navigator.share({
            title: title,
            text: shareText
          });
          return;
        }
      } catch (err: any) {
        // User explicitly closed share sheet
        if (err?.name === 'AbortError') {
          return;
        }
        console.warn('Native web share restricted or unavailable in current environment:', err?.message || err);
      }
    }

    // Permission denied / Security restricted fallback
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 3000);
    } catch {
      // ignore clipboard error
    }

    triggerDownloadFallback();
    setShareNotice('📥 Video saved to downloads & caption copied to clipboard! (Browser iframe share sheet restricted)');
    setTimeout(() => setShareNotice(null), 6000);
  };

  // 2. Direct YouTube API Upload
  const handleYouTubeDirectUpload = async () => {
    if (!videoBlob) {
      setYtError('Video file blob is not available.');
      return;
    }

    if (!ytAccessToken.trim()) {
      setYtError('Please connect your YouTube Account or enter an Access Token below.');
      return;
    }

    setIsUploadingYt(true);
    setYtError(null);
    setYtSuccessUrl(null);
    setYtUploadProgress(10);

    try {
      // Step 1: Initiate Resumable Upload
      const metadata = {
        snippet: {
          title: ytTitle,
          description: ytDescription,
          tags: ['Quran', 'Islam', 'Tilawat', 'QuranRecitation', 'Shorts', surahName],
          categoryId: '22' // People & Blogs
        },
        status: {
          privacyStatus: ytPrivacy,
          selfDeclaredMadeForKids: false
        }
      };

      setYtUploadProgress(25);

      const initRes = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ytAccessToken.trim()}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': videoBlob.type || 'video/mp4'
          },
          body: JSON.stringify(metadata)
        }
      );

      if (!initRes.ok) {
        const errJson = await initRes.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `YouTube API auth error (${initRes.status}). Access token may be expired; try re-connecting your YouTube account.`);
      }

      const uploadUrl = initRes.headers.get('Location');
      if (!uploadUrl) {
        throw new Error('YouTube did not return an upload session location header.');
      }

      setYtUploadProgress(50);

      // Step 2: Upload Video File Binary Data
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': videoBlob.type || 'video/mp4'
        },
        body: videoBlob
      });

      setYtUploadProgress(90);

      if (!uploadRes.ok) {
        throw new Error(`Failed during video binary upload to YouTube (Status ${uploadRes.status}).`);
      }

      const uploadResult = await uploadRes.json();
      const videoId = uploadResult.id;
      setYtUploadProgress(100);

      if (videoId) {
        const finalUrl = `https://youtu.be/${videoId}`;
        setYtSuccessUrl(finalUrl);
      } else {
        setYtSuccessUrl('https://studio.youtube.com');
      }
    } catch (err: any) {
      console.error('YouTube upload error:', err);
      setYtError(err.message || 'Failed to upload video to YouTube.');
    } finally {
      setIsUploadingYt(false);
    }
  };

  const copyToClipboard = (text: string, type: 'title' | 'caption') => {
    navigator.clipboard.writeText(text);
    if (type === 'title') {
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } else {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    }
  };

  const instagramCaption = `✨ Heart-Soothing Quran Recitation\n📖 ${title}\n🎙️ Reciter: ${reciterName}\n\n"Verily, in the remembrance of Allah do hearts find rest." (13:28)\n\n#Quran #Surah${surahName.replace(/[^a-zA-Z]/g, '')} #Islam #Tilawat #QuranRecitation #IslamicReminder #AyahOfTheDay #DailyQuran #Muslim #Reels`;

  return (
    <div className="bg-[#0b1220] rounded-xl border border-amber-500/30 p-4 space-y-4 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Direct Social Media Upload &amp; Sharing
          </h4>
        </div>

        {/* Format Tag */}
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          {isShortsFormat ? '9:16 Shorts / Reel' : '16:9 Landscape'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-[#141e33] p-1 rounded-lg text-xs font-medium border border-slate-800">
        <button
          onClick={() => setActiveTab('webshare')}
          className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'webshare' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Direct Share App</span>
        </button>

        <button
          onClick={() => setActiveTab('youtube')}
          className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'youtube' ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Youtube className="w-3.5 h-3.5" />
          <span>YouTube Upload</span>
        </button>

        <button
          onClick={() => setActiveTab('instagram')}
          className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'instagram' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Instagram className="w-3.5 h-3.5" />
          <span>Instagram Reel</span>
        </button>
      </div>

      {/* TAB 1: Direct Web Share (No system download needed) */}
      {activeTab === 'webshare' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-300">
            Send this video directly into <strong className="text-amber-300">Instagram, YouTube Shorts, TikTok, WhatsApp or Telegram</strong> without manual local folder saving:
          </p>

          <button
            onClick={handleDirectWebShare}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Post Directly to Instagram / YouTube / WhatsApp</span>
          </button>

          {shareNotice && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-xs font-medium text-amber-200 animate-in fade-in">
              {shareNotice}
            </div>
          )}

          <div className="p-3 bg-[#131d33] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> One-Touch Sharing
            </span>
            <p>
              Clicking above opens your device&apos;s native share sheet. Select Instagram Reels or YouTube Shorts to publish immediately!
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: YouTube Direct Upload */}
      {activeTab === 'youtube' && (
        <div className="space-y-3">
          {/* Account Connection Status & Sign-in Button */}
          <div className="p-3 bg-[#131d33] rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-slate-200">YouTube Account Connection</span>
              </div>
              <button
                onClick={() => setShowTokenHelp(!showTokenHelp)}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" />
                <span>What is Access Token?</span>
              </button>
            </div>

            {/* Explanation Modal / Banner */}
            {showTokenHelp && (
              <div className="p-2.5 bg-slate-900/90 border border-amber-500/40 rounded-lg text-[11px] text-slate-300 space-y-1.5 animate-in fade-in">
                <p className="font-semibold text-amber-300">💡 What is a YouTube Access Token?</p>
                <p>
                  A <strong>YouTube Access Token</strong> is a secure temporary pass generated by Google after you sign in with your Google account. It allows our video generator to upload videos directly into your YouTube channel without storing your account password.
                </p>
                <p className="text-slate-400 text-[10px]">
                  You can connect your Google Account in 1 click using the button below, or paste a token generated from Google OAuth Playground.
                </p>
              </div>
            )}

            {/* Connected vs Disconnected State */}
            {ytAccessToken ? (
              <div className="flex items-center justify-between p-2 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-xs">
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>YouTube Channel Connected</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Disconnect</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleConnectYouTubeOAuth}
                  className="w-full py-2.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-600/20 transition-colors"
                >
                  <Youtube className="w-4 h-4" />
                  <span>Connect YouTube Account (Sign in with Google)</span>
                </button>

                <div className="text-center">
                  <button
                    onClick={() => setShowAdvancedKey(!showAdvancedKey)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    {showAdvancedKey ? 'Hide Manual Access Token Input' : 'Or Paste Token / Client ID Manually'}
                  </button>
                </div>
              </div>
            )}

            {/* Advanced Token Input Form */}
            {(!ytAccessToken || showAdvancedKey) && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                    <span>Paste OAuth Access Token</span>
                    <a
                      href="https://developers.google.com/oauthplayground/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>Get token from OAuth Playground</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </label>
                  <input
                    type="password"
                    placeholder="ya29.a0Ax... (Paste Google OAuth token)"
                    value={ytAccessToken}
                    onChange={(e) => setYtAccessToken(e.target.value)}
                    className="w-full bg-[#0e1626] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Video Title</label>
              <input
                type="text"
                value={ytTitle}
                onChange={(e) => setYtTitle(e.target.value)}
                className="w-full bg-[#131d33] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Description &amp; Hashtags</label>
              <textarea
                rows={3}
                value={ytDescription}
                onChange={(e) => setYtDescription(e.target.value)}
                className="w-full bg-[#131d33] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Privacy</label>
              <select
                value={ytPrivacy}
                onChange={(e) => setYtPrivacy(e.target.value as any)}
                className="w-full bg-[#131d33] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="public">Public (Everyone)</option>
                <option value="unlisted">Unlisted (Link only)</option>
                <option value="private">Private (Only you)</option>
              </select>
            </div>
          </div>

          {ytError && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-[11px]">
              {ytError}
            </div>
          )}

          {ytSuccessUrl && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-lg text-emerald-200 text-xs flex items-center justify-between">
              <span className="font-semibold">Uploaded Successfully!</span>
              <a
                href={ytSuccessUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold rounded text-[11px] flex items-center gap-1"
              >
                <span>View on YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleYouTubeDirectUpload}
              disabled={isUploadingYt}
              className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50"
            >
              {isUploadingYt ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading to YouTube ({ytUploadProgress}%)...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Directly to YouTube</span>
                </>
              )}
            </button>

            <a
              href="https://studio.youtube.com"
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1"
            >
              <span>YouTube Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* TAB 3: Instagram Reel Helper */}
      {activeTab === 'instagram' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-300">
            Publish as Instagram Reel with viral Quran hashtags:
          </p>

          <div className="space-y-2">
            <div className="bg-[#131d33] p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-300">Instagram Caption &amp; Hashtags</span>
                <button
                  onClick={() => copyToClipboard(instagramCaption, 'caption')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] rounded font-semibold border border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  {copiedCaption ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCaption ? 'Copied!' : 'Copy Caption'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-300 whitespace-pre-line font-mono bg-slate-950/60 p-2 rounded border border-slate-900 max-h-28 overflow-y-auto">
                {instagramCaption}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDirectWebShare}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-pink-600/20"
            >
              <Instagram className="w-4 h-4" />
              <span>Share to Instagram App</span>
            </button>

            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1"
            >
              <span>Open Instagram Web</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
