// src/App.jsx
// GameVault — Firebase real, sem mocks

import React, { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import {
  loginWithGoogle,
  logoutUser,
  getUserProfile,
  getAllUsers,
  updateUser,
  getGames,
  createGame,
  updateGame,
  deleteGame,
  getReviewsByGame,
  getAllReviews,
  getUserReviewForGame,
  upsertReview,
  deleteReview,
} from "./services";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const avg = (arr) =>
  arr.length ? (arr.reduce((s, r) => s + r.rating, 0) / arr.length).toFixed(1) : null;

const scoreColor = (score) => {
  if (!score) return "#555";
  if (score >= 4) return "#00d474";
  if (score >= 2.5) return "#ffbd3f";
  return "#ff4b4b";
};

const PLATFORMS = ["PC", "PS5", "Xbox"];

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@300;400;500;600&display=swap');

  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --surface2: #18181f;
    --border: #2a2a35;
    --accent: #ffbd3f;
    --accent2: #ff6b35;
    --text: #e8e8f0;
    --muted: #888898;
    --green: #00d474;
    --red: #ff4b4b;
    --font-display: 'Barlow Condensed', sans-serif;
    --font-body: 'Barlow', sans-serif;
    --radius: 6px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    min-height: 100vh;
  }

  /* HEADER */
  .header {
    position: sticky; top: 0; z-index: 100;
    background: rgba(10,10,15,0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    padding: 0 24px;
    display: flex; align-items: center; justify-content: space-between;
    height: 60px;
  }
  .logo {
    font-family: var(--font-display);
    font-size: 26px; font-weight: 900;
    letter-spacing: 1px;
    color: var(--accent);
    text-transform: uppercase;
  }
  .logo span { color: var(--text); }
  .header-right { display: flex; align-items: center; gap: 12px; }

  /* BUTTONS */
  .btn {
    padding: 8px 16px; border-radius: var(--radius);
    font-family: var(--font-body); font-size: 13px; font-weight: 600;
    cursor: pointer; border: none; transition: all 0.15s;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-primary:hover { background: #ffd070; }
  .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
  .btn-danger { background: transparent; color: var(--red); border: 1px solid var(--red); }
  .btn-danger:hover { background: var(--red); color: #fff; }
  .btn-sm { padding: 5px 10px; font-size: 11px; }
  .btn-google {
    display: flex; align-items: center; gap: 10px;
    background: #fff; color: #111; padding: 12px 24px;
    border-radius: var(--radius); font-size: 15px; font-weight: 600;
    border: none; cursor: pointer; transition: all 0.15s;
  }
  .btn-google:hover { background: #f0f0f0; transform: translateY(-1px); }
  .btn-google svg { width: 20px; height: 20px; }

  /* USER PILL */
  .user-pill {
    display: flex; align-items: center; gap: 8px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 40px; padding: 4px 12px 4px 4px;
  }
  .user-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    object-fit: cover; border: 2px solid var(--border);
  }
  .user-avatar-placeholder {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--accent); color: #000;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
  }
  .user-name { font-size: 13px; font-weight: 500; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .role-badge {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    padding: 2px 6px; border-radius: 3px;
  }
  .role-superadmin { background: #4f3cff22; color: #a48aff; border: 1px solid #4f3cff55; }
  .role-admin { background: #ff6b3522; color: #ff6b35; border: 1px solid #ff6b3555; }
  .role-user { background: #ffffff11; color: var(--muted); border: 1px solid var(--border); }

  /* NAV TABS */
  .nav-tabs {
    display: flex; gap: 4px;
  }
  .nav-tab {
    padding: 6px 14px; border-radius: var(--radius);
    background: none; border: none; color: var(--muted);
    font-family: var(--font-body); font-size: 13px; font-weight: 600;
    cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;
    transition: all 0.15s;
  }
  .nav-tab:hover { color: var(--text); }
  .nav-tab.active { background: var(--surface2); color: var(--accent); }

  /* MAIN */
  .main { max-width: 1280px; margin: 0 auto; padding: 32px 24px; }

  /* HERO */
  .hero {
    text-align: center; padding: 80px 24px;
    background: radial-gradient(ellipse at 50% 0%, #ffbd3f15 0%, transparent 70%);
  }
  .hero-title {
    font-family: var(--font-display); font-size: clamp(48px, 8vw, 96px);
    font-weight: 900; text-transform: uppercase; line-height: 0.95;
    letter-spacing: -1px;
  }
  .hero-title span { color: var(--accent); }
  .hero-sub { color: var(--muted); font-size: 18px; margin-top: 16px; max-width: 480px; margin-left: auto; margin-right: auto; }
  .hero-cta { margin-top: 32px; }

  /* FILTERS */
  .filters {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 28px; flex-wrap: wrap;
  }
  .filter-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .filter-select {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); padding: 7px 12px; border-radius: var(--radius);
    font-family: var(--font-body); font-size: 13px; cursor: pointer;
  }
  .search-input {
    flex: 1; min-width: 200px; max-width: 320px;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); padding: 7px 14px; border-radius: var(--radius);
    font-family: var(--font-body); font-size: 13px;
  }
  .search-input::placeholder { color: var(--muted); }
  .search-input:focus { outline: none; border-color: var(--accent); }

  /* GAME GRID */
  .games-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }

  /* GAME CARD */
  .game-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; overflow: hidden;
    cursor: pointer; transition: all 0.2s;
    position: relative;
  }
  .game-card:hover { border-color: var(--accent); transform: translateY(-3px); box-shadow: 0 12px 40px #00000060; }
  .game-card-img {
    width: 100%; height: 160px; object-fit: cover;
    background: var(--surface2);
    display: flex; align-items: center; justify-content: center;
    font-size: 40px;
  }
  .game-card-img img { width: 100%; height: 100%; object-fit: cover; }
  .game-card-body { padding: 14px; }
  .game-card-title {
    font-family: var(--font-display); font-size: 18px; font-weight: 700;
    letter-spacing: 0.3px; line-height: 1.2; margin-bottom: 4px;
  }
  .game-card-meta { font-size: 12px; color: var(--muted); margin-bottom: 10px; }
  .game-card-footer {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 10px;
  }
  .score-badge {
    width: 44px; height: 44px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display); font-size: 20px; font-weight: 900;
    border: 2px solid;
  }
  .review-count { font-size: 11px; color: var(--muted); }
  .category-tag {
    display: inline-block; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px;
    padding: 2px 8px; border-radius: 3px;
    background: #ffffff10; color: var(--muted); border: 1px solid var(--border);
    margin-bottom: 6px;
  }
  .flag-disabled {
    position: absolute; top: 8px; right: 8px;
    background: #0008; border: 1px solid #ff4b4b55;
    color: var(--red); font-size: 10px; font-weight: 700;
    text-transform: uppercase; padding: 2px 7px; border-radius: 3px;
  }

  /* GAME DETAIL */
  .game-detail-header {
    display: grid; grid-template-columns: 300px 1fr; gap: 32px;
    margin-bottom: 40px;
  }
  @media (max-width: 700px) { .game-detail-header { grid-template-columns: 1fr; } }
  .game-detail-img {
    width: 100%; aspect-ratio: 4/3; object-fit: cover;
    border-radius: 10px; background: var(--surface2);
    display: flex; align-items: center; justify-content: center; font-size: 60px;
    overflow: hidden;
  }
  .game-detail-img img { width: 100%; height: 100%; object-fit: cover; }
  .game-detail-title {
    font-family: var(--font-display); font-size: clamp(32px, 5vw, 56px);
    font-weight: 900; text-transform: uppercase; line-height: 1; margin-bottom: 8px;
  }
  .game-detail-meta { color: var(--muted); font-size: 14px; margin-bottom: 16px; }
  .game-detail-desc { color: var(--text); line-height: 1.7; margin-bottom: 20px; }
  .score-big {
    display: inline-flex; align-items: center; justify-content: center;
    width: 72px; height: 72px; border-radius: 12px;
    font-family: var(--font-display); font-size: 34px; font-weight: 900;
    border: 3px solid; margin-right: 16px;
  }
  .platforms-list { display: flex; gap: 8px; flex-wrap: wrap; }
  .platform-pill {
    padding: 4px 12px; border-radius: 20px;
    font-size: 12px; font-weight: 600;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--muted);
  }

  /* SECTION TITLE */
  .section-title {
    font-family: var(--font-display); font-size: 22px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px;
    margin-bottom: 20px; padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }

  /* REVIEW FORM */
  .review-form {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 24px; margin-bottom: 28px;
  }
  .form-row { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
  .form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 160px; }
  .form-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); }
  .form-select, .form-textarea, .form-input {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); padding: 9px 12px; border-radius: var(--radius);
    font-family: var(--font-body); font-size: 14px;
  }
  .form-textarea { resize: vertical; min-height: 90px; }
  .form-select:focus, .form-textarea:focus, .form-input:focus { outline: none; border-color: var(--accent); }

  /* STARS */
  .stars-input { display: flex; gap: 6px; }
  .star {
    font-size: 24px; cursor: pointer; transition: all 0.1s;
    color: var(--border);
    background: none; border: none; padding: 0;
  }
  .star.active { color: var(--accent); }
  .star:hover { transform: scale(1.2); }

  /* REVIEW CARD */
  .review-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 18px; margin-bottom: 12px;
    display: flex; gap: 16px;
  }
  .review-score {
    width: 44px; height: 44px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display); font-size: 22px; font-weight: 900;
    border: 2px solid;
  }
  .review-author { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
  .review-meta { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
  .review-text { font-size: 14px; line-height: 1.6; color: #ccc; }
  .review-actions { display: flex; gap: 8px; margin-top: 10px; }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0; background: #000a;
    display: flex; align-items: center; justify-content: center;
    z-index: 200; padding: 20px;
  }
  .modal {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 28px; width: 100%; max-width: 540px;
    max-height: 85vh; overflow-y: auto;
  }
  .modal-title {
    font-family: var(--font-display); font-size: 24px; font-weight: 700;
    text-transform: uppercase; margin-bottom: 20px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .modal-close {
    background: none; border: none; color: var(--muted);
    font-size: 22px; cursor: pointer; line-height: 1;
  }
  .modal-close:hover { color: var(--text); }

  /* ADMIN TABLE */
  .admin-table { width: 100%; border-collapse: collapse; }
  .admin-table th {
    text-align: left; font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.5px; color: var(--muted); font-weight: 700;
    padding: 8px 12px; border-bottom: 1px solid var(--border);
  }
  .admin-table td {
    padding: 12px 12px; border-bottom: 1px solid var(--border);
    font-size: 13px; vertical-align: middle;
  }
  .admin-table tr:hover td { background: var(--surface2); }

  /* STATS BAR */
  .stats-row { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 28px; }
  .stat-card {
    flex: 1; min-width: 120px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 16px;
  }
  .stat-value { font-family: var(--font-display); font-size: 32px; font-weight: 900; color: var(--accent); }
  .stat-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

  /* BACK BUTTON */
  .back-btn {
    display: inline-flex; align-items: center; gap: 6px;
    color: var(--muted); font-size: 13px; font-weight: 600;
    background: none; border: none; cursor: pointer;
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 24px;
    transition: color 0.15s;
  }
  .back-btn:hover { color: var(--accent); }

  /* EMPTY STATE */
  .empty {
    text-align: center; padding: 60px 20px; color: var(--muted);
  }
  .empty-icon { font-size: 48px; margin-bottom: 12px; }
  .empty-text { font-size: 16px; }

  /* TOAST */
  .toast {
    position: fixed; bottom: 24px; right: 24px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 14px 20px;
    font-size: 14px; z-index: 999;
    box-shadow: 0 8px 32px #00000080;
    animation: slideUp 0.3s ease;
    max-width: 320px;
  }
  .toast.success { border-left: 4px solid var(--green); }
  .toast.error { border-left: 4px solid var(--red); }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  /* LOADING */
  .loading {
    display: flex; align-items: center; justify-content: center;
    height: 200px; color: var(--muted); font-size: 16px; gap: 10px;
  }
  .spinner {
    width: 20px; height: 20px; border-radius: 50%;
    border: 2px solid var(--border); border-top-color: var(--accent);
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* LOGIN SCREEN */
  .login-screen {
    min-height: 80vh; display: flex; align-items: center; justify-content: center;
  }
  .login-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; padding: 48px; text-align: center; max-width: 400px; width: 100%;
  }
  .login-icon { font-size: 56px; margin-bottom: 16px; }
  .login-title { font-family: var(--font-display); font-size: 28px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
  .login-sub { color: var(--muted); font-size: 15px; margin-bottom: 28px; line-height: 1.5; }

  .divider { height: 1px; background: var(--border); margin: 24px 0; }
`;

// ─────────────────────────────────────────────
// TOAST HOOK
// ─────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);
  return { toast, show };
}

// ─────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast ${toast.type}`}>{toast.msg}</div>;
}

function Spinner() {
  return <div className="loading"><div className="spinner" /> Carregando...</div>;
}

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="stars-input">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          className={`star ${s <= (hover || value) ? "active" : ""}`}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ScoreBadge({ score, size = "sm" }) {
  const color = scoreColor(score);
  const cls = size === "lg" ? "score-big" : "score-badge";
  return (
    <div className={cls} style={{ borderColor: color, color }}>
      {score || "—"}
    </div>
  );
}

function GameCard({ game, reviews, onClick, isAdmin, onEdit, onDelete, onToggleReviews }) {
  const gameReviews = reviews.filter((r) => r.gameId === game.id);
  const score = avg(gameReviews);

  return (
    <div className="game-card" onClick={onClick}>
      {!game.reviewsEnabled && <span className="flag-disabled">Avaliações off</span>}
      <div className="game-card-img">
        {game.image ? <img src={game.image} alt={game.title} /> : "🎮"}
      </div>
      <div className="game-card-body">
        <span className="category-tag">{game.category}</span>
        <div className="game-card-title">{game.title}</div>
        <div className="game-card-meta">
          {game.developer} · {game.releaseYear}
        </div>
        <div className="game-card-footer">
          <ScoreBadge score={score} />
          <div>
            <div className="review-count">{gameReviews.length} avaliações</div>
            <div className="review-count">{game.platforms?.join(", ")}</div>
          </div>
        </div>
        {isAdmin && (
          <div
            className="review-actions"
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}
          >
            <button className="btn btn-secondary btn-sm" onClick={onEdit}>Editar</button>
            <button className="btn btn-secondary btn-sm"
              onClick={onToggleReviews}
            >
              {game.reviewsEnabled ? "Desativar" : "Ativar"} Reviews
            </button>
            <button className="btn btn-danger btn-sm" onClick={onDelete}>Excluir</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// GAME FORM MODAL
// ─────────────────────────────────────────────

function GameFormModal({ game, onClose, onSave, toast }) {
  const [form, setForm] = useState({
    title: game?.title || "",
    description: game?.description || "",
    category: game?.category || "Ação",
    developer: game?.developer || "",
    publisher: game?.publisher || "",
    releaseYear: game?.releaseYear || new Date().getFullYear(),
    platforms: game?.platforms || [],
    image: game?.image || "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const cats = ["Ação", "RPG", "Aventura", "Esportes", "FPS", "Estratégia", "Puzzle", "Terror", "Indie", "Simulação"];

  const togglePlatform = (p) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter((x) => x !== p)
        : [...f.platforms, p],
    }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.show("Título obrigatório", "error"); return; }
    setSaving(true);
    try {
      await onSave(form, imageFile);
      onClose();
    } catch (e) {
      toast.show("Erro ao salvar: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          {game ? "Editar Jogo" : "Novo Jogo"}
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Título *</label>
          <input className="form-input" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <select className="form-select" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Ano</label>
            <input className="form-input" type="number" value={form.releaseYear}
              onChange={(e) => setForm(f => ({ ...f, releaseYear: Number(e.target.value) }))} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Desenvolvedor</label>
            <input className="form-input" value={form.developer} onChange={(e) => setForm(f => ({ ...f, developer: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Publisher</label>
            <input className="form-input" value={form.publisher} onChange={(e) => setForm(f => ({ ...f, publisher: e.target.value }))} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Descrição</label>
          <textarea className="form-textarea" value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Plataformas</label>
          <div style={{ display: "flex", gap: 8 }}>
            {PLATFORMS.map((p) => (
              <button key={p} type="button"
                className={`btn btn-sm ${form.platforms.includes(p) ? "btn-primary" : "btn-secondary"}`}
                onClick={() => togglePlatform(p)}>{p}</button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Imagem (upload)</label>
          <input type="file" accept="image/*"
            style={{ color: "var(--text)", fontSize: 13 }}
            onChange={(e) => setImageFile(e.target.files[0])} />
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Ou URL da imagem</label>
          <input className="form-input" value={form.image}
            placeholder="https://..."
            onChange={(e) => setForm(f => ({ ...f, image: e.target.value }))} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// GAME DETAIL PAGE
// ─────────────────────────────────────────────

function GameDetailPage({ game, currentUser, userProfile, allReviews, onBack, onReviewsChange, toast }) {
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ rating: 0, platform: "PC", text: "" });
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin";
  const isBanned = userProfile?.banned;

  useEffect(() => {
    loadReviews();
  }, [game.id]);

  async function loadReviews() {
    setLoading(true);
    try {
      const data = await getReviewsByGame(game.id);
      setReviews(data);
      if (currentUser) {
        const mine = data.find((r) => r.userId === currentUser.uid);
        setMyReview(mine || null);
        if (mine) setForm({ rating: mine.rating, platform: mine.platform, text: mine.text });
      }
    } finally {
      setLoading(false);
    }
  }

  const score = avg(reviews);
  const canReview = currentUser && !isBanned && game.reviewsEnabled && (!myReview || editing);

  async function handleSubmit() {
    if (!form.rating) { toast.show("Selecione uma nota", "error"); return; }
    if (!form.text.trim()) { toast.show("Escreva um comentário", "error"); return; }
    setSubmitting(true);
    try {
      await upsertReview(currentUser.uid, game.id, {
        rating: form.rating,
        platform: form.platform,
        text: form.text,
        userName: currentUser.displayName,
        userPhoto: currentUser.photoURL,
      });
      toast.show("Avaliação salva!");
      setEditing(false);
      await loadReviews();
      onReviewsChange();
    } catch (e) {
      toast.show("Erro: " + e.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(reviewId) {
    if (!window.confirm("Excluir avaliação?")) return;
    await deleteReview(reviewId);
    toast.show("Avaliação excluída");
    await loadReviews();
    onReviewsChange();
  }

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Voltar</button>

      <div className="game-detail-header">
        <div className="game-detail-img">
          {game.image ? <img src={game.image} alt={game.title} /> : "🎮"}
        </div>
        <div>
          <span className="category-tag">{game.category}</span>
          <div className="game-detail-title">{game.title}</div>
          <div className="game-detail-meta">
            {game.developer} · {game.publisher} · {game.releaseYear}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <ScoreBadge score={score} size="lg" />
            <div>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>{reviews.length} avaliações</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Nota média</div>
            </div>
          </div>
          <div className="game-detail-desc">{game.description}</div>
          <div className="platforms-list">
            {game.platforms?.map((p) => <span key={p} className="platform-pill">{p}</span>)}
          </div>
          {!game.reviewsEnabled && (
            <div style={{ marginTop: 12, color: "var(--red)", fontSize: 13, fontWeight: 600 }}>
              ⚠ Avaliações desabilitadas para este jogo
            </div>
          )}
        </div>
      </div>

      {/* REVIEW FORM */}
      {!currentUser && (
        <div className="review-form" style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 12, color: "var(--muted)" }}>Faça login para avaliar este jogo</div>
        </div>
      )}

      {isBanned && (
        <div className="review-form" style={{ textAlign: "center", color: "var(--red)" }}>
          Sua conta está banida e não pode publicar avaliações.
        </div>
      )}

      {currentUser && !isBanned && game.reviewsEnabled && !myReview && (
        <div className="review-form">
          <div className="section-title" style={{ marginBottom: 16, fontSize: 16 }}>Escrever Avaliação</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sua nota</label>
              <StarInput value={form.rating} onChange={(v) => setForm(f => ({ ...f, rating: v }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Plataforma</label>
              <select className="form-select" value={form.platform}
                onChange={(e) => setForm(f => ({ ...f, platform: e.target.value }))}>
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Comentário</label>
            <textarea className="form-textarea" value={form.text} placeholder="O que você achou do jogo?"
              onChange={(e) => setForm(f => ({ ...f, text: e.target.value }))} />
          </div>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Publicando..." : "Publicar Avaliação"}
          </button>
        </div>
      )}

      {myReview && editing && (
        <div className="review-form">
          <div className="section-title" style={{ marginBottom: 16, fontSize: 16 }}>Editar Avaliação</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sua nota</label>
              <StarInput value={form.rating} onChange={(v) => setForm(f => ({ ...f, rating: v }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Plataforma</label>
              <select className="form-select" value={form.platform}
                onChange={(e) => setForm(f => ({ ...f, platform: e.target.value }))}>
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Comentário</label>
            <textarea className="form-textarea" value={form.text}
              onChange={(e) => setForm(f => ({ ...f, text: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </button>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* REVIEWS LIST */}
      <div className="section-title">Avaliações ({reviews.length})</div>

      {loading ? <Spinner /> : reviews.length === 0 ? (
        <div className="empty"><div className="empty-icon">💬</div><div className="empty-text">Nenhuma avaliação ainda</div></div>
      ) : reviews.map((r) => {
        const color = scoreColor(r.rating);
        const isMine = currentUser && r.userId === currentUser.uid;
        return (
          <div key={r.id} className="review-card">
            <div className="review-score" style={{ borderColor: color, color }}>{r.rating}</div>
            <div style={{ flex: 1 }}>
              <div className="review-author">{r.userName}</div>
              <div className="review-meta">{r.platform} · {r.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—"}</div>
              <div className="review-text">{r.text}</div>
              {(isMine || isAdmin) && (
                <div className="review-actions">
                  {isMine && <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Editar</button>}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>Excluir</button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN PANEL
// ─────────────────────────────────────────────

function AdminPanel({ currentUser, userProfile, games, allReviews, toast, onDataChange }) {
  const [tab, setTab] = useState("games");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showGameForm, setShowGameForm] = useState(false);
  const [editGame, setEditGame] = useState(null);

  const isSuperAdmin = userProfile?.role === "superadmin";

  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [tab]);

  async function loadUsers() {
    setLoadingUsers(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoadingUsers(false);
  }

  async function handleCreateGame(formData, imageFile) {
    await createGame(formData, imageFile);
    toast.show("Jogo criado!");
    onDataChange();
  }

  async function handleUpdateGame(formData, imageFile) {
    await updateGame(editGame.id, formData, imageFile);
    toast.show("Jogo atualizado!");
    onDataChange();
  }

  async function handleDeleteGame(game) {
    if (!window.confirm(`Excluir "${game.title}"? Todas as avaliações serão removidas.`)) return;
    await deleteGame(game.id);
    toast.show("Jogo excluído");
    onDataChange();
  }

  async function handleToggleReviews(game) {
    await updateGame(game.id, { reviewsEnabled: !game.reviewsEnabled });
    toast.show(game.reviewsEnabled ? "Avaliações desativadas" : "Avaliações ativadas");
    onDataChange();
  }

  async function handleBanUser(user) {
    const action = user.banned ? "desbanir" : "banir";
    if (!window.confirm(`Quer ${action} ${user.name}?`)) return;
    await updateUser(user.id, { banned: !user.banned });
    toast.show(`Usuário ${user.banned ? "desbanido" : "banido"}`);
    loadUsers();
  }

  async function handlePromote(user) {
    if (!window.confirm(`Promover ${user.name} a admin?`)) return;
    await updateUser(user.id, { role: "admin" });
    toast.show("Usuário promovido a admin");
    loadUsers();
  }

  async function handleDemote(user) {
    if (!isSuperAdmin) { toast.show("Apenas o superadmin pode rebaixar admins", "error"); return; }
    if (!window.confirm(`Rebaixar ${user.name} para usuário comum?`)) return;
    await updateUser(user.id, { role: "user" });
    toast.show("Admin rebaixado");
    loadUsers();
  }

  const totalReviews = allReviews.length;
  const avgRating = allReviews.length
    ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)
    : "—";

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 900, textTransform: "uppercase", marginBottom: 4 }}>
          Painel Admin
        </div>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>
          Logado como <strong>{userProfile?.name}</strong> · {" "}
          <span className={`role-badge role-${userProfile?.role}`}>{userProfile?.role}</span>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card"><div className="stat-value">{games.length}</div><div className="stat-label">Jogos</div></div>
        <div className="stat-card"><div className="stat-value">{totalReviews}</div><div className="stat-label">Avaliações</div></div>
        <div className="stat-card"><div className="stat-value">{avgRating}</div><div className="stat-label">Nota Média</div></div>
        <div className="stat-card"><div className="stat-value">{games.filter(g => !g.reviewsEnabled).length}</div><div className="stat-label">Reviews Off</div></div>
      </div>

      <div className="nav-tabs" style={{ marginBottom: 24 }}>
        {["games", "reviews", "users"].map((t) => (
          <button key={t} className={`nav-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "games" ? "🎮 Jogos" : t === "reviews" ? "⭐ Avaliações" : "👥 Usuários"}
          </button>
        ))}
      </div>

      {/* GAMES TAB */}
      {tab === "games" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => setShowGameForm(true)}>+ Novo Jogo</button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoria</th>
                <th>Reviews</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const gReviews = allReviews.filter((r) => r.gameId === g.id);
                const gScore = avg(gReviews);
                return (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 600 }}>{g.title}</td>
                    <td><span className="category-tag">{g.category}</span></td>
                    <td>
                      <ScoreBadge score={gScore} />
                      <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 12 }}>{gReviews.length} avaliações</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 700, color: g.reviewsEnabled ? "var(--green)" : "var(--red)" }}>
                        {g.reviewsEnabled ? "✓ ON" : "✗ OFF"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditGame(g); setShowGameForm(true); }}>Editar</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleToggleReviews(g)}>
                          {g.reviewsEnabled ? "Desativar" : "Ativar"}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteGame(g)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* REVIEWS TAB */}
      {tab === "reviews" && (
        <div>
          <table className="admin-table">
            <thead>
              <tr><th>Jogo</th><th>Usuário</th><th>Nota</th><th>Plataforma</th><th>Data</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {allReviews.map((r) => {
                const game = games.find((g) => g.id === r.gameId);
                return (
                  <tr key={r.id}>
                    <td>{game?.title || r.gameId}</td>
                    <td>{r.userName}</td>
                    <td><ScoreBadge score={r.rating} /></td>
                    <td>{r.platform}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{r.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—"}</td>
                    <td>
                      <button className="btn btn-danger btn-sm"
                        onClick={async () => {
                          if (!window.confirm("Excluir avaliação?")) return;
                          await deleteReview(r.id);
                          toast.show("Avaliação excluída");
                          onDataChange();
                        }}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* USERS TAB */}
      {tab === "users" && (
        loadingUsers ? <Spinner /> : (
          <table className="admin-table">
            <thead>
              <tr><th>Nome</th><th>Email</th><th>Role</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {u.photo
                      ? <img src={u.photo} alt="" className="user-avatar" />
                      : <div className="user-avatar-placeholder">{u.name?.[0]}</div>}
                    {u.name}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{u.email}</td>
                  <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 700, color: u.banned ? "var(--red)" : "var(--green)" }}>
                      {u.banned ? "Banido" : "Ativo"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {u.role === "user" && u.id !== currentUser.uid && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handlePromote(u)}>Promover</button>
                      )}
                      {u.role === "admin" && isSuperAdmin && u.id !== currentUser.uid && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDemote(u)}>Rebaixar</button>
                      )}
                      {u.id !== currentUser.uid && u.role !== "superadmin" && (
                        <button className={`btn btn-sm ${u.banned ? "btn-secondary" : "btn-danger"}`}
                          onClick={() => handleBanUser(u)}>
                          {u.banned ? "Desbanir" : "Banir"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {showGameForm && (
        <GameFormModal
          game={editGame}
          onClose={() => { setShowGameForm(false); setEditGame(null); }}
          onSave={editGame ? handleUpdateGame : handleCreateGame}
          toast={toast}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [games, setGames] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [view, setView] = useState("home"); // "home" | "detail" | "admin"
  const [selectedGame, setSelectedGame] = useState(null);

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Todas");
  const [filterPlatform, setFilterPlatform] = useState("Todas");

  const toast = useToast();

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setDataLoading(true);
    const [g, r] = await Promise.all([getGames(), getAllReviews()]);
    setGames(g);
    setAllReviews(r);
    setDataLoading(false);
  }

  async function handleLogin() {
    try {
      await loginWithGoogle();
      toast.show("Login realizado com sucesso!");
    } catch (e) {
      toast.show("Erro no login: " + e.message, "error");
    }
  }

  async function handleLogout() {
    await logoutUser();
    setView("home");
    toast.show("Até logo!");
  }

  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin";

  // Filters
  const categories = ["Todas", ...new Set(games.map((g) => g.category).filter(Boolean))];
  const filtered = games.filter((g) => {
    const matchSearch = g.title?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "Todas" || g.category === filterCat;
    const matchPlatform = filterPlatform === "Todas" || g.platforms?.includes(filterPlatform);
    return matchSearch && matchCat && matchPlatform;
  });

  if (authLoading) return (
    <>
      <style>{css}</style>
      <div className="loading" style={{ height: "100vh" }}><div className="spinner" /> Autenticando...</div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <Toast toast={toast.toast} />

      {/* HEADER */}
      <header className="header">
        <div className="logo" onClick={() => setView("home")} style={{ cursor: "pointer" }}>
          Game<span>Vault</span>
        </div>

        <div className="nav-tabs">
          <button className={`nav-tab ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>Biblioteca</button>
          {isAdmin && (
            <button className={`nav-tab ${view === "admin" ? "active" : ""}`} onClick={() => setView("admin")}>Admin</button>
          )}
        </div>

        <div className="header-right">
          {currentUser ? (
            <>
              <div className="user-pill">
                {currentUser.photoURL
                  ? <img src={currentUser.photoURL} className="user-avatar" alt="" />
                  : <div className="user-avatar-placeholder">{currentUser.displayName?.[0]}</div>}
                <span className="user-name">{currentUser.displayName}</span>
                <span className={`role-badge role-${userProfile?.role || "user"}`}>{userProfile?.role || "user"}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Sair</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={handleLogin}>Login com Google</button>
          )}
        </div>
      </header>

      {/* CONTENT */}
      <main className="main">
        {view === "admin" && isAdmin ? (
          <AdminPanel
            currentUser={currentUser}
            userProfile={userProfile}
            games={games}
            allReviews={allReviews}
            toast={toast}
            onDataChange={loadData}
          />
        ) : view === "detail" && selectedGame ? (
          <GameDetailPage
            game={selectedGame}
            currentUser={currentUser}
            userProfile={userProfile}
            allReviews={allReviews}
            onBack={() => setView("home")}
            onReviewsChange={loadData}
            toast={toast}
          />
        ) : (
          <>
            {/* HERO */}
            {!currentUser && (
              <div className="hero">
                <div className="hero-title">
                  Descubra <span>e avalie</span><br />seus jogos
                </div>
                <div className="hero-sub">A biblioteca de videogames com avaliações reais da comunidade.</div>
                <div className="hero-cta">
                  <button className="btn-google" onClick={handleLogin}>
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continuar com Google
                  </button>
                </div>
              </div>
            )}

            {/* FILTERS */}
            <div className="filters">
              <input
                className="search-input"
                placeholder="Buscar jogo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="filter-label">Categoria</span>
              <select className="filter-select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <span className="filter-label">Plataforma</span>
              <select className="filter-select" value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
                {["Todas", ...PLATFORMS].map((p) => <option key={p}>{p}</option>)}
              </select>
              {isAdmin && (
                <button className="btn btn-primary btn-sm"
                  onClick={() => setView("admin")}>
                  + Adicionar Jogo
                </button>
              )}
            </div>

            {/* GAMES GRID */}
            {dataLoading ? <Spinner /> : filtered.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🎮</div>
                <div className="empty-text">
                  {games.length === 0 ? "Nenhum jogo cadastrado ainda." : "Nenhum jogo encontrado."}
                </div>
              </div>
            ) : (
              <div className="games-grid">
                {filtered.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    reviews={allReviews}
                    isAdmin={isAdmin}
                    onClick={() => { setSelectedGame(game); setView("detail"); }}
                    onEdit={() => {/* handled inline in admin panel */}}
                    onDelete={() => {}}
                    onToggleReviews={() => {}}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
