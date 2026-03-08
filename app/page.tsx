"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { LogOut, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import AuthForm from "@/components/auth/AuthForm";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useGameStore } from "@/store/gameStore";
import { usePartyKitContext } from "@/contexts/PartyKitContext";
import DrawingCanvas from "@/components/game/DrawingCanvas";
import FightArena from "@/components/game/FightArena";
import Button from "@/components/ui/Button";
import { PartyStatus } from "@/components/ui/PartyStatus";
import { HowToPlay } from "@/components/ui/HowToPlay";

type MenuView = "main" | "gamba" | "lobby" | "join";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Home() {
  const { user, loading } = useAuth();
  const [menuView, setMenuView] = useState<MenuView>("main");
  const [roomCode, setRoomCodeLocal] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [gambaAmount, setGambaAmount] = useState("");
  const [showGambaTos, setShowGambaTos] = useState(false);
  const [pendingWagerAmount, setPendingWagerAmount] = useState(0);

  // Mobile warning
  useEffect(() => {
    if (loading) return;
    const hasShownWarning = sessionStorage.getItem("mobile-warning-shown");
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    if (isMobile && !hasShownWarning) {
      const timer = setTimeout(() => {
        toast(
          "Hey! Looks like you're on a smaller screen. This app works better on desktop, The arena and canvas are fixed size, so some content may be cut off, but everything works the same.",
          {
            duration: 10000,
            style: {
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: "14px",
            },
          },
        );
        sessionStorage.setItem("mobile-warning-shown", "true");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const {
    phase,
    setPhase,
    setGameMode,
    setRoomCode,
    setIsHost,
    setOpponent,
    setOpponentStrokes,
    setBattleSeed,
    reset,
  } = useGameStore();
  const [partyState, partyActions] = usePartyKitContext();

  // Discord + display name
  const discordId = user?.uid.startsWith("discord:")
    ? user.uid.split(":")[1]
    : undefined;
  const [displayName, setDisplayName] = useState(
    user?.displayName || user?.email?.split("@")[0] || "Player",
  );
  const [stkBalance, setStkBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!discordId || !user) return;
    // Get display name from token claims (signInWithCustomToken doesn't set displayName)
    user
      .getIdTokenResult()
      .then((result) => {
        const username = result.claims.username as string | undefined;
        if (username) setDisplayName(username);
      })
      .catch(() => {});
    // Get STK balance
    fetch(`/api/stackcoin/balance?discord_id=${discordId}`)
      .then((r) => r.json())
      .then(({ balance }) => {
        if (balance !== null) setStkBalance(balance);
      })
      .catch(() => {});
  }, [user, discordId]);

  // Re-fetch balance after wager payout or dispute so the displayed balance is current
  useEffect(() => {
    if (!discordId || (!partyState.wagerPayout && !partyState.wagerDisputed))
      return;
    fetch(`/api/stackcoin/balance?discord_id=${discordId}`)
      .then((r) => r.json())
      .then(({ balance }) => {
        if (balance !== null) setStkBalance(balance);
      })
      .catch(() => {});
  }, [discordId, partyState.wagerPayout, partyState.wagerDisputed]);

  const isDiscordWithStk = !!discordId && stkBalance !== null;

  // Sync PartyKit state to game store
  useEffect(() => {
    if (partyState.roomState?.phase === "fighting") {
      const opponentStrokes =
        partyState.role === "host"
          ? partyState.roomState.guestStrokes
          : partyState.roomState.hostStrokes;
      if (opponentStrokes) setOpponentStrokes(opponentStrokes);
      if (partyState.battleSeed !== null) setBattleSeed(partyState.battleSeed);
      setPhase("fighting");
    } else if (
      partyState.roomState?.phase === "drawing" &&
      partyState.roomState.hostId &&
      partyState.roomState.guestId
    ) {
      setPhase("drawing");
    }
  }, [
    partyState.roomState?.phase,
    partyState.roomState?.hostId,
    partyState.roomState?.guestId,
    partyState.role,
    partyState.roomState?.hostStrokes,
    partyState.roomState?.guestStrokes,
    partyState.battleSeed,
    setPhase,
    setOpponentStrokes,
    setBattleSeed,
  ]);

  // Update opponent info
  useEffect(() => {
    if (!partyState.roomState || !partyState.role) return;
    const opponentName =
      partyState.role === "host"
        ? partyState.roomState.guestName
        : partyState.roomState.hostName;
    if (opponentName)
      setOpponent({ id: "opponent", username: opponentName, avatar: "" });
  }, [partyState.roomState, partyState.role, setOpponent]);

  // Handle opponent leaving
  useEffect(() => {
    if (!partyState.opponentLeft) return;
    partyActions.clearOpponentLeft();
    partyActions.disconnect();
    reset();
    setTimeout(() => {
      setMenuView("main");
      setRoomCodeLocal("");
      setJoinCode("");
      setCopied(false);
      setPendingWagerAmount(0);
    }, 0);
  }, [partyState.opponentLeft, partyActions, reset]);

  // Auto-propose wager when opponent joins a gamba lobby
  useEffect(() => {
    if (
      menuView === "lobby" &&
      pendingWagerAmount > 0 &&
      partyState.role === "host" &&
      partyState.roomState?.hostId &&
      partyState.roomState?.guestId &&
      partyState.opponentHasDiscord &&
      partyState.wagerStatus === "none" &&
      partyState.status === "connected"
    ) {
      partyActions.sendProposeWager(pendingWagerAmount);
    }
  }, [
    menuView,
    pendingWagerAmount,
    partyState.role,
    partyState.roomState?.hostId,
    partyState.roomState?.guestId,
    partyState.opponentHasDiscord,
    partyState.wagerStatus,
    partyState.status,
    partyActions,
  ]);

  // Reset menu view when disconnected
  useEffect(() => {
    if (partyState.status === "disconnected" && menuView === "lobby") {
      setTimeout(() => {
        setMenuView("main");
        setRoomCodeLocal("");
        setJoinCode("");
        setCopied(false);
        setPendingWagerAmount(0);
      }, 0);
    }
  }, [partyState.status, menuView]);

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthForm />;
  if (phase === "drawing")
    return (
      <>
        <DrawingCanvas />
        <PartyStatus />
      </>
    );
  if (phase === "fighting")
    return (
      <>
        <FightArena />
        <PartyStatus />
      </>
    );

  const handleGenerateCode = (wagerAmount = 0) => {
    const code = generateRoomCode();
    setRoomCodeLocal(code);
    setRoomCode(code);
    setIsHost(true);
    setGameMode("multiplayer");
    setMenuView("lobby");
    setPendingWagerAmount(wagerAmount);
    partyActions.connect(code, displayName, discordId);
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinRoom = () => {
    if (joinCode.length === 6) {
      const code = joinCode.toUpperCase();
      setRoomCodeLocal(code);
      setRoomCode(code);
      setIsHost(false);
      setGameMode("multiplayer");
      setMenuView("lobby");
      partyActions.connect(code, displayName, discordId);
    }
  };

  const handleFightNPC = () => {
    setGameMode("npc");
    setPhase("drawing");
  };

  const handleBack = () => {
    partyActions.disconnect();
    setMenuView("main");
    setRoomCodeLocal("");
    setJoinCode("");
    setCopied(false);
    setRoomCode(null);
    setIsHost(false);
    setPendingWagerAmount(0);
  };

  const handleToggleReady = () => {
    const myLobbyReady =
      partyState.role === "host"
        ? partyState.roomState?.hostLobbyReady
        : partyState.roomState?.guestLobbyReady;
    if (myLobbyReady) {
      partyActions.sendLobbyUnready();
    } else {
      partyActions.sendLobbyReady();
    }
  };

  // ===== GAMBA VIEW =====
  if (menuView === "gamba") {
    const parsedAmount = parseInt(gambaAmount, 10);
    const isValidAmount =
      !isNaN(parsedAmount) &&
      parsedAmount > 0 &&
      parsedAmount <= (stkBalance ?? 0);

    return (
      <div className="transparent-bg w-full max-w-md mx-auto p-lg rounded-sm border border-white/20">
        <header className="mb-md text-center">
          <h1 className="text-xl font-bold text-white">GAMBA</h1>
          <p className="text-white/50 text-sm mt-1">
            Set a wager — loser pays the winner
          </p>
        </header>

        {stkBalance !== null && (
          <p className="text-center text-white/60 text-sm mb-md flex items-center justify-center gap-1">
            Your balance:{" "}
            <Image src="/stack-coin.png" alt="STK" width={14} height={14} />
            <span className="text-white font-bold">
              {stkBalance.toLocaleString()} STK
            </span>
          </p>
        )}

        <div className="bg-black/40 border-2 border-white/30 rounded-sm p-md mb-md">
          <input
            type="number"
            value={gambaAmount}
            onChange={(e) => setGambaAmount(e.target.value)}
            placeholder="Enter STK amount"
            min={1}
            max={stkBalance ?? undefined}
            className="w-full bg-transparent text-3xl font-bold text-center text-white font-mono placeholder:text-white/20 outline-none"
            autoFocus
          />
          {gambaAmount && !isValidAmount && (
            <p className="text-red-400 text-xs text-center mt-2">
              {parsedAmount > (stkBalance ?? 0)
                ? "Insufficient balance"
                : "Enter a valid amount"}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => handleGenerateCode(parsedAmount)}
            disabled={!isValidAmount}
            variant="success"
            size="lg"
            fullWidth
          >
            Generate Match Code
          </Button>
          <Button
            onClick={() => setMenuView("main")}
            variant="secondary"
            size="lg"
            fullWidth
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  // ===== LOBBY VIEW =====
  if (menuView === "lobby") {
    const isConnecting = partyState.status === "connecting";
    const isConnected = partyState.status === "connected";
    const hasOpponent =
      partyState.roomState?.hostId && partyState.roomState?.guestId;
    const opponentName =
      partyState.role === "host"
        ? partyState.roomState?.guestName
        : partyState.roomState?.hostName;
    const myLobbyReady =
      partyState.role === "host"
        ? partyState.roomState?.hostLobbyReady
        : partyState.roomState?.guestLobbyReady;
    const opponentLobbyReady =
      partyState.role === "host"
        ? partyState.roomState?.guestLobbyReady
        : partyState.roomState?.hostLobbyReady;

    const { wagerStatus, wagerAmount, opponentHasDiscord } = partyState;
    const isGambaLobby = pendingWagerAmount > 0;

    const wagerBlocked =
      wagerStatus === "proposed" || wagerStatus === "pending_payment";

    return (
      <div className="transparent-bg w-full max-w-md mx-auto p-lg rounded-sm border border-white/20">
        <header className="mb-md text-center">
          <h1 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            {isGambaLobby ? (
              <>
                🔥 GAMBA —{" "}
                <Image src="/stack-coin.png" alt="STK" width={16} height={16} />
                {pendingWagerAmount} STK 🔥
              </>
            ) : wagerAmount > 0 ? (
              <>
                🔥 GAMBA —{" "}
                <Image src="/stack-coin.png" alt="STK" width={16} height={16} />
                {wagerAmount} STK 🔥
              </>
            ) : hasOpponent ? (
              "READY TO BATTLE!"
            ) : (
              "WAITING FOR OPPONENT"
            )}
          </h1>
          {(isGambaLobby || wagerAmount > 0) && (
            <div className="relative inline-block mt-2">
              <button
                onMouseEnter={() => setShowGambaTos(true)}
                onMouseLeave={() => setShowGambaTos(false)}
                className="text-white/30 text-xs hover:text-white/60 transition-colors underline underline-offset-2"
              >
                terms & conditions
              </button>
              {showGambaTos && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900/95 border border-white/20 rounded-lg px-4 py-3 text-xs w-72 shadow-xl z-10 text-left">
                  <div className="font-bold text-white/90 mb-2 border-b border-white/10 pb-1.5">
                    Terms & Conditions
                  </div>
                  <p className="text-white/70 mb-2 leading-relaxed">
                    If you genuinely thought there were terms and conditions for this, you&apos;re sick.
                  </p>
                  <p className="text-white/70 leading-relaxed">
                    With that being said, I&apos;m pretty sure I&apos;ve handled all the edge cases for this. but if you find a bug, please let me know I&apos;ll see about getting your STK back. - Alex
                  </p>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Room code */}
        <div className="bg-black/40 border-2 border-white/30 rounded-sm p-md mb-md relative">
          <p className="text-xs text-center text-white/50 mb-1">ROOM CODE</p>
          <p className="text-4xl font-bold text-center text-white tracking-[0.3em] font-mono">
            {roomCode}
          </p>
          <button
            onClick={handleCopyCode}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Connection status */}
        <div className="text-center mb-md">
          {isConnecting && (
            <div className="flex items-center justify-center gap-2 text-white/70">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting...</span>
            </div>
          )}
          {partyState.status === "error" && (
            <p className="text-red-400">
              {partyState.error || "Connection failed"}
            </p>
          )}
          {isConnected && !hasOpponent && (
            <p className="text-white/70">Share the code with your friend!</p>
          )}
          {isConnected &&
            hasOpponent &&
            wagerStatus === "none" &&
            !isGambaLobby && (
              <p className="text-green-400 font-bold">{opponentName} joined!</p>
            )}
        </div>

        {/* Players */}
        <div className="flex justify-between mb-md px-4">
          <div className="text-center">
            <p className="text-xs text-white/50 mb-1">
              YOU{" "}
              {partyState.role && (
                <span className="text-white/30">({partyState.role})</span>
              )}
            </p>
            <p className="text-white font-bold">{displayName}</p>
            {myLobbyReady && (
              <p className="text-sm font-bold text-green-400 mt-0.5">READY</p>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-white/50 mb-1">
              OPPONENT{" "}
              {hasOpponent && partyState.role === "guest" && (
                <span className="text-white/30">(host)</span>
              )}
            </p>
            {hasOpponent ? (
              <>
                <p className="text-white font-bold">{opponentName}</p>
                {opponentLobbyReady && (
                  <p className="text-sm font-bold text-green-400 mt-0.5">
                    READY
                  </p>
                )}
              </>
            ) : (
              <p className="text-white/30">...</p>
            )}
          </div>
        </div>

        {/* Wager UI */}
        {hasOpponent && wagerStatus !== "none" && (
          <div className="mb-3">
            {/* Host: waiting for guest to accept */}
            {partyState.role === "host" && wagerStatus === "proposed" && (
              <div className="text-center text-white/70 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Waiting for opponent to accept {wagerAmount} STK wager...
              </div>
            )}

            {/* Guest: accept or decline */}
            {partyState.role === "guest" && wagerStatus === "proposed" && (
              <div className="flex flex-col gap-2">
                <p className="text-center text-white font-bold text-sm">
                  Host wants to wager{" "}
                  <span className="text-yellow-400">{wagerAmount} STK</span>
                  {stkBalance !== null && (
                    <span className="text-white/50 font-normal ml-2">
                      (
                      <Image
                        src="/stack-coin.png"
                        alt="STK"
                        width={12}
                        height={12}
                        className="inline mb-0.5"
                      />{" "}
                      {stkBalance.toLocaleString()} STK)
                    </span>
                  )}
                </p>
                {discordId &&
                  stkBalance !== null &&
                  stkBalance < wagerAmount && (
                    <p className="text-center text-red-400 text-xs">
                      Insufficient balance ({stkBalance} STK)
                    </p>
                  )}
                <div className="flex gap-2">
                  <Button
                    onClick={partyActions.sendAcceptWager}
                    disabled={
                      !discordId ||
                      (stkBalance !== null && stkBalance < wagerAmount)
                    }
                    variant="success"
                    size="md"
                    fullWidth
                  >
                    Accept Wager
                  </Button>
                  <Button
                    onClick={handleBack}
                    variant="secondary"
                    size="md"
                    fullWidth
                  >
                    Decline
                  </Button>
                </div>
              </div>
            )}

            {/* Both: pending payment */}
            {wagerStatus === "pending_payment" && (
              <div className="text-center text-yellow-400 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Accept the {wagerAmount} STK request from the StackCoin bot...
              </div>
            )}

            {/* Both: confirmed */}
            {wagerStatus === "confirmed" && (
              <div className="text-center text-green-400 font-bold text-sm py-2">
                ✅ Wager confirmed — {wagerAmount} STK each!
              </div>
            )}

            {/* Dispute/refund notice */}
            {partyState.wagerDisputed && (
              <div className="text-center text-orange-400 font-bold text-sm py-2">
                Wager cancelled — coins refunded
              </div>
            )}
          </div>
        )}

        {/* Gamba lobby: waiting for opponent and no discord */}
        {isGambaLobby &&
          hasOpponent &&
          !opponentHasDiscord &&
          wagerStatus === "none" && (
            <div className="text-center text-red-400 text-sm mb-3">
              Opponent must be logged in with Discord to play Gamba
            </div>
          )}

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleToggleReady}
            disabled={
              !hasOpponent ||
              wagerBlocked ||
              (isGambaLobby && wagerStatus !== "confirmed")
            }
            variant="success"
            size="lg"
            fullWidth
          >
            {!hasOpponent
              ? "Waiting..."
              : wagerBlocked
                ? "Resolve wager first..."
                : isGambaLobby && wagerStatus !== "confirmed"
                  ? "Waiting for wager..."
                  : myLobbyReady
                    ? opponentLobbyReady
                      ? "Starting..."
                      : "Unready"
                    : "Ready!"}
          </Button>
          <Button
            onClick={handleBack}
            variant="secondary"
            size="lg"
            fullWidth
            icon={<LogOut className="w-4 h-4" />}
          >
            Leave Room
          </Button>
        </div>
      </div>
    );
  }

  // ===== JOIN VIEW =====
  if (menuView === "join") {
    return (
      <div className="transparent-bg w-full max-w-md mx-auto p-lg rounded-sm border border-white/20">
        <header className="mb-md text-center">
          <h1 className="text-xl font-bold text-white">ENTER CODE</h1>
        </header>

        <div className="bg-black/40 border-2 border-white/30 rounded-sm p-md mb-md">
          <input
            type="text"
            value={joinCode}
            onChange={(e) =>
              setJoinCode(e.target.value.toUpperCase().slice(0, 6))
            }
            placeholder="XXXXXX"
            maxLength={6}
            className="w-full bg-transparent text-4xl font-bold text-center text-white tracking-[0.3em] font-mono placeholder:text-white/20 outline-none"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleJoinRoom}
            disabled={joinCode.length !== 6}
            variant="success"
            size="lg"
            fullWidth
          >
            Join Game
          </Button>
          <Button
            onClick={() => setMenuView("main")}
            variant="secondary"
            size="lg"
            fullWidth
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  // ===== MAIN MENU =====
  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center">
      <Button
        onClick={() => auth.signOut()}
        variant="secondary"
        size="md"
        icon={<LogOut className="w-4 h-4" />}
        className="absolute top-4 left-4 z-10 max-[768px]:top-6"
      >
        Sign Out
      </Button>

      {stkBalance !== null && (
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 text-sm font-medium text-white">
          <Image src="/stack-coin.png" alt="STK" width={20} height={20} />
          <span>{stkBalance.toLocaleString()} STK</span>
        </div>
      )}

      <HowToPlay />

      <div className="transparent-bg w-full max-w-md mx-auto p-lg rounded-sm border border-white/20">
        <header className="mb-xl text-center">
          <h1 className="text-3xl font-bold text-white">blob.you</h1>
        </header>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => handleGenerateCode()}
            variant="primary"
            size="lg"
            fullWidth
          >
            Generate Match Code
          </Button>
          {isDiscordWithStk && (
            <Button
              onClick={() => setMenuView("gamba")}
              variant="primary"
              size="lg"
              fullWidth
              icon={
                <Image src="/stack-coin.png" alt="STK" width={18} height={18} />
              }
            >
              Gamba
            </Button>
          )}
          <Button
            onClick={() => setMenuView("join")}
            variant="primary"
            size="lg"
            fullWidth
          >
            Enter Match Code
          </Button>
          <Button
            onClick={handleFightNPC}
            variant="primary"
            size="lg"
            fullWidth
          >
            Offline Match
          </Button>
        </div>
      </div>
    </div>
  );
}
