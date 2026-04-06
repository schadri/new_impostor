import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ghost, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

function Home() {
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert([{ status: 'waiting' }])
        .select()
        .single();
      
      if (error) throw error;
      navigate(`/room/${data.id}`);
    } catch (error) {
      alert('Error al crear sala: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
      navigate(`/room/${joinCode.trim()}`);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h1 className="glow-text">IMPOSTOR</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>Descubre el secreto o elimina a todos.</p>
        
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            className="btn-primary" 
            onClick={handleCreateRoom}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Users size={20} />
            {loading ? 'Creando...' : 'Crear Sala Privada'}
          </button>

          <div style={{ margin: '1rem 0', position: 'relative' }}>
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--secondary)', padding: '0 10px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>O</span>
          </div>

          <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder="Ingresa el Link o Código de Sala" 
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button 
              type="submit" 
              className="btn-secondary"
              disabled={!joinCode.trim()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Ghost size={20} />
              Unirse
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Home;
