import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, Users, Play, Skull, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getRandomWord } from '../lib/words';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState(null);

  // Cargar datos iniciales de la sala y suscribirse a Supabase Presence
  useEffect(() => {
    let roomChannel;
    let dbChangesSubscription;

    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (error || !data) {
        alert('Sala no encontrada');
        navigate('/');
        return;
      }
      const { data: dbPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId);
      
      setRoom(data);
      if (dbPlayers) setPlayers(dbPlayers.map(p => ({ ...p, isOnline: false })));
      setLoading(false);

      // Usar Supabase Realtime Channels para Presence y Cambios
      roomChannel = supabase.channel(`room:${roomId}`);

      // Presence: Estado de quién está conectado
      roomChannel.on('presence', { event: 'sync' }, () => {
        const presenceState = roomChannel.presenceState();
        const activeIds = Object.values(presenceState).flat().map(p => p.player_id);
        
        setPlayers(current => 
          current.map(p => ({
             ...p,
             isOnline: activeIds.includes(p.id)
          }))
        );
      });

      // Suscribirse a cambios en la tabla rooms
      dbChangesSubscription = supabase.channel(`db-changes-${roomId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
          (payload) => {
            setRoom(payload.new);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
          (payload) => {
             setPlayers(current => {
                const updated = [...current];
                const index = updated.findIndex(p => p.id === payload.new.id);
                if (index !== -1) {
                   updated[index] = { ...updated[index], ...payload.new };
                } else if (payload.eventType === 'INSERT') {
                   updated.push({ ...payload.new, isOnline: true });
                }
                return updated;
             });
          }
        )
        .subscribe();

      roomChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setChannel(roomChannel);
        }
      });
    };

    fetchRoom();

    return () => {
      if (roomChannel) supabase.removeChannel(roomChannel);
      if (dbChangesSubscription) supabase.removeChannel(dbChangesSubscription);
    };
  }, [roomId, navigate]);

  // Enviar el estado online a Presence una vez que se une y el canal está listo
  useEffect(() => {
    if (!hasJoined || !myPlayerId || !playerName || !channel) return;

    const trackPresence = async () => {
      await channel.track({
        player_id: myPlayerId
      });
    };

    trackPresence();
  }, [hasJoined, myPlayerId, playerName, channel]);


  const joinGame = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const isHost = players.filter(p => p.isOnline).length === 0;

    const { data: player, error } = await supabase
      .from('players')
      .insert([{
        room_id: roomId,
        name: playerName,
        is_host: isHost,
        role: 'waiting'
      }])
      .select()
      .single();

    if (error) {
      alert('Error uniendo a sala');
      return;
    }

    setMyPlayerId(player.id);
    setHasJoined(true);
  };

  const startGame = async () => {
    // Solo host manda a iniciar
    const amIHost = players.find(p => p.id === myPlayerId)?.isHost;
    if (!amIHost) return;

    if (players.length < 2) {
      alert('Se necesitan al menos 2 jugadores');
      return;
    }

    // Elegir impostor entre los conectados
    const impostorIndex = Math.floor(Math.random() * onlinePlayers.length);
    const secretWord = getRandomWord();
    
    // Actualizar roles solo de conectados
    const updates = onlinePlayers.map((p, index) => {
       return supabase
         .from('players')
         .update({ role: index === impostorIndex ? 'impostor' : 'crewmate' })
         .eq('id', p.id);
    });

    await Promise.all(updates);

    // Actualizar estado de sala
    await supabase
      .from('rooms')
      .update({ status: 'playing', secret_word: secretWord })
      .eq('id', roomId);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('¡Enlace copiado!');
  };

  const onlinePlayers = players.filter(p => p.isOnline);

  if (loading) return <div className="container" style={{ textAlign: 'center' }}>Cargando...</div>;

  if (!hasJoined) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <h2>Unirse a la Sala</h2>
          <p>Jugadores en sala: {onlinePlayers.length}</p>
          <form onSubmit={joinGame} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <input 
              type="text" 
              placeholder="Tu Apodo" 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={15}
            />
            <button type="submit" className="btn-primary" disabled={!playerName.trim()}>Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  const amIHost = onlinePlayers.find(p => p.id === myPlayerId)?.is_host;
  const myData = players.find(p => p.id === myPlayerId);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>SALA: <span style={{ color: 'var(--accent)' }}>{roomId.split('-')[0]}</span></h2>
        <button className="btn-secondary" onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Copy size={16} /> Compartir Link
        </button>
      </div>

      <div className="card">
        {room.status === 'waiting' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Lobby ({onlinePlayers.length}/10)</h3>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {onlinePlayers.map((p) => (
                <div key={p.id} style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: '10px 20px', 
                  borderRadius: '20px',
                  border: p.id === myPlayerId ? '1px solid var(--accent)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Users size={16} color={p.is_host ? 'var(--accent)' : 'white'} />
                  {p.name} {p.id === myPlayerId ? '(Tú)' : ''}
                </div>
              ))}
            </div>

            {amIHost && (
              <button 
                className="btn-primary" 
                onClick={startGame}
                style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Play size={20} /> Empezar Partida
              </button>
            )}
            {!amIHost && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '2rem' }}>
                Esperando al host para iniciar...
              </p>
            )}
          </>
        )}

        {room.status === 'playing' && myData && (
          <div style={{ textAlign: 'center', padding: '3rem 0', animation: 'fadeIn 1s ease' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: myData.role === 'impostor' ? 'var(--impostor)' : 'var(--crewmate)' }}>
              ERES {myData.role === 'impostor' ? 'EL IMPOSTOR' : 'TRIPULANTE'}
            </h1>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
              {myData.role === 'impostor' ? <Skull size={100} color="var(--impostor)" /> : <ShieldCheck size={100} color="var(--crewmate)" />}
            </div>
            {myData.role !== 'impostor' ? (
              <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '1.5rem', borderRadius: '12px', marginTop: '1rem', border: '1px solid var(--crewmate)' }}>
                <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem', opacity: 0.8 }}>La palabra secreta es:</p>
                <h2 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>{room.secret_word}</h2>
              </div>
            ) : (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '1.5rem', borderRadius: '12px', marginTop: '1rem', border: '1px solid var(--impostor)' }}>
                <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem', opacity: 0.8 }}>Tu objetivo:</p>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Finge conocer la palabra averíguala escuchando a los demás.</h2>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default Room;
