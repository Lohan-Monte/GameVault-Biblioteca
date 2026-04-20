// src/App.jsx — GameVault v3

import React, { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import {
  loginWithGoogle, loginWithEmail, registerWithEmail,
  logoutUser, changePassword,
  getUserProfile, getAllUsers, updateUser,
  getGames, createGame, updateGame, deleteGame,
  getMovies, createMovie, updateMovie, deleteMovie,
  getReviewsByGame, getReviewsByMovie, getAllReviews, getAllMovieReviews,
  upsertReview, upsertMovieReview, deleteReview,
  getCategories, createCategory, updateCategory, deleteCategory,
  getPlatforms, createPlatform, updatePlatform, deletePlatform,
  getGenres, createGenre, updateGenre, deleteGenre,
} from "./services";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const avg = (arr) =>
  arr.length ? (arr.reduce((s, r) => s + r.rating, 0) / arr.length).toFixed(1) : null;

const scoreColor = (score) => {
  const n = parseFloat(score);
  if (!score || isNaN(n)) return "#4a4a5a";
  if (n >= 7.5) return "#00e676";
  if (n >= 5)   return "#ffd740";
  return "#ff4b4b";
};

// Smart rating formatter: if value > 10, insert dot after first digit (11→1.1, 50→5.0)
function smartRating(raw) {
  const s = String(raw).replace(",", ".");
  const n = parseFloat(s);
  if (isNaN(n)) return s;
  if (n > 10) {
    const digits = s.replace(".", "");
    return digits[0] + "." + (digits[1] || "0");
  }
  return s;
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  :root {
    --bg:          #080a14;
    --surface:     #0e1020;
    --surface2:    #161829;
    --surface3:    #1e2035;
    --border:      #2a2d45;
    --accent:      #ff0062;
    --accent2:     #ff3385;
    --accent-glow: #ff006233;
    --accent-film: #6c63ff;
    --accent-film2:#9b94ff;
    --text:        #eaeaf5;
    --muted:       #6e7090;
    --green:       #00e676;
    --red:         #ff1744;
    --yellow:      #ffd740;
    --font-display: 'Inter', sans-serif;
    --font-body:    'Inter', sans-serif;
    --radius:   10px;
    --radius-lg: 16px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; cursor: default; user-select: none; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    min-height: 100vh;
  }

  input, textarea { cursor: text; user-select: text; }
  select { cursor: pointer; user-select: none; }
  button, a, [role="button"] { cursor: pointer; }
  a { color: var(--accent2); text-decoration: none; }

  /* ── SCROLLBAR ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--surface); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  /* ── HEADER ── */
  .header {
    position: sticky; top: 0; z-index: 200;
    background: rgba(8,10,20,0.97);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    height: 64px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 20px;
    gap: 12px;
  }
  .header-left  { display: flex; align-items: center; gap: 10px; }
  .header-right { display: flex; align-items: center; gap: 10px; justify-content: flex-end; }

  .logo { display: flex; align-items: center; justify-content: center; cursor: pointer; user-select: none; }
  .logo img { height: 36px; width: auto; display: block; transition: opacity 0.15s; }
  .logo img:hover { opacity: 0.85; }

  /* ── SECTION TABS (Games / Movies) ── */
  .section-tabs {
    display: flex; gap: 4px; margin-bottom: 28px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 5px; width: fit-content;
  }
  .section-tab {
    padding: 9px 24px; border-radius: var(--radius);
    background: none; border: none;
    font-family: var(--font-body); font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all 0.18s; color: var(--muted); letter-spacing: 0.2px;
  }
  .section-tab:hover { color: var(--text); }
  .section-tab.active-games {
    background: var(--accent); color: #fff;
    box-shadow: 0 2px 12px var(--accent-glow);
  }
  .section-tab.active-movies {
    background: var(--accent-film); color: #fff;
    box-shadow: 0 2px 12px #6c63ff33;
  }

  /* ── HAMBURGER ── */
  .hamburger {
    width: 40px; height: 40px; border-radius: 10px;
    background: var(--surface2); border: 1px solid var(--border);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 5px; cursor: pointer; transition: all 0.2s; flex-shrink: 0;
  }
  .hamburger:hover { border-color: var(--accent); background: var(--surface3); }
  .hamburger span { display: block; width: 18px; height: 2px; background: var(--text); border-radius: 2px; transition: all 0.2s; }

  /* ── DRAWER ── */
  .drawer-overlay { position: fixed; inset: 0; background: #00000080; z-index: 300; opacity: 0; pointer-events: none; transition: opacity 0.25s; }
  .drawer-overlay.open { opacity: 1; pointer-events: all; }
  .drawer { position: fixed; left: 0; top: 0; bottom: 0; width: 280px; background: var(--surface); border-right: 1px solid var(--border); z-index: 301; transform: translateX(-100%); transition: transform 0.25s cubic-bezier(.4,0,.2,1); display: flex; flex-direction: column; }
  .drawer.open { transform: translateX(0); }
  .drawer-header { padding: 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .drawer-title { font-family: var(--font-display); font-size: 20px; font-weight: 800; }
  .drawer-close { width: 32px; height: 32px; border-radius: 8px; background: var(--surface2); border: 1px solid var(--border); color: var(--muted); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .drawer-body { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
  .drawer-footer { padding: 16px; border-top: 1px solid var(--border); }
  .drawer-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; cursor: pointer; transition: all 0.15s; font-size: 15px; font-weight: 600; color: var(--text); background: none; border: none; width: 100%; text-align: left; }
  .drawer-item:hover { background: var(--surface2); color: var(--accent2); }
  .drawer-item .di-icon { font-size: 14px; width: 24px; text-align: center; }
  .drawer-separator { height: 1px; background: var(--border); margin: 8px 0; }
  .drawer-user { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px; background: var(--surface2); margin-bottom: 8px; }
  .drawer-user-info { flex: 1; min-width: 0; }
  .drawer-user-name { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .drawer-user-role { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }

  /* ── BUTTONS ── */
  .btn { padding: 9px 18px; border-radius: var(--radius); font-family: var(--font-body); font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: all 0.15s; letter-spacing: 0.2px; display: inline-flex; align-items: center; gap: 6px; }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover { background: var(--accent2); transform: translateY(-1px); }
  .btn-primary-film { background: var(--accent-film); color: #fff; }
  .btn-primary-film:hover { background: var(--accent-film2); transform: translateY(-1px); }
  .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent2); }
  .btn-danger { background: transparent; color: var(--red); border: 1px solid var(--red); }
  .btn-danger:hover { background: var(--red); color: #fff; }
  .btn-ghost { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 13px; font-weight: 600; }
  .btn-ghost:hover { color: var(--text); }
  .btn-sm { padding: 5px 12px; font-size: 12px; }
  .btn-google { display: flex; align-items: center; gap: 10px; background: #fff; color: #111; padding: 12px 22px; border-radius: var(--radius); font-size: 14px; font-weight: 700; border: none; cursor: pointer; transition: all 0.15s; }
  .btn-google:hover { background: #f0f0f0; transform: translateY(-1px); }
  .btn-google svg { width: 18px; height: 18px; flex-shrink: 0; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

  /* ── USER PILL ── */
  .user-pill { display: flex; align-items: center; gap: 8px; background: var(--surface2); border: 1px solid var(--border); border-radius: 40px; padding: 4px 12px 4px 4px; }
  .user-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
  .user-avatar-placeholder { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }
  .user-name { font-size: 13px; font-weight: 600; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* ── ROLE BADGE ── */
  .role-badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 7px; border-radius: 20px; }
  .role-superadmin { background: #ff006222; color: #ff85b3; border: 1px solid #ff006255; }
  .role-admin { background: #ff336622; color: #ff6699; border: 1px solid #ff336655; }
  .role-user { background: #ffffff10; color: var(--muted); border: 1px solid var(--border); }

  /* ── MAIN ── */
  .main { max-width: 1360px; margin: 0 auto; padding: 32px 24px; }

  /* ── HERO ── */
  .hero { text-align: center; padding: 80px 24px 60px; background: radial-gradient(ellipse at 50% 0%, var(--accent-glow) 0%, transparent 60%); }
  .hero-title { font-family: var(--font-display); font-size: clamp(48px, 8vw, 96px); font-weight: 900; line-height: 0.95; letter-spacing: -2px; background: linear-gradient(135deg, #fff 30%, var(--accent2) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .hero-sub { color: var(--muted); font-size: 17px; margin-top: 16px; line-height: 1.6; }
  .hero-cta { margin-top: 32px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

  /* ── FILTERS ── */
  .filters { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; flex-wrap: wrap; }
  .search-input { flex: 1; min-width: 200px; max-width: 320px; background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 9px 14px; border-radius: var(--radius); font-family: var(--font-body); font-size: 14px; }
  .search-input::placeholder { color: var(--muted); }
  .search-input:focus { outline: none; border-color: var(--accent); }
  .filter-select { background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 9px 12px; border-radius: var(--radius); font-family: var(--font-body); font-size: 13px; cursor: pointer; }
  .filter-select:focus { outline: none; border-color: var(--accent); }

  /* ── CONTENT GRID (games & movies) ── */
  .content-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }

  /* ── CARD ── */
  .content-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); overflow: hidden;
    cursor: pointer; transition: all 0.2s; position: relative;
    display: flex; flex-direction: column;
  }
  .content-card:hover { border-color: var(--accent); transform: translateY(-4px); box-shadow: 0 16px 48px #00000070, 0 0 0 1px var(--accent-glow); }
  .content-card.film-card:hover { border-color: var(--accent-film); box-shadow: 0 16px 48px #00000070, 0 0 0 1px #6c63ff33; }
  .card-img { width: 100%; height: 180px; object-fit: cover; background: var(--surface2); display: flex; align-items: center; justify-content: center; font-size: 48px; overflow: hidden; flex-shrink: 0; }
  .card-img img { width: 100%; height: 100%; object-fit: cover; }
  .card-body { padding: 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .card-title { font-family: var(--font-display); font-size: 16px; font-weight: 700; line-height: 1.3; letter-spacing: -0.2px; }
  .card-meta { font-size: 12px; color: var(--muted); }
  .card-footer {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: auto; padding-top: 12px;
    border-top: 1px solid var(--border);
  }
  .card-score-block { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .card-review-count { font-size: 11px; color: var(--muted); font-weight: 600; text-align: center; }
  .card-platforms { font-size: 11px; color: var(--muted); text-align: right; max-width: 130px; line-height: 1.4; }

  /* ── SCORE BADGES ── */
  .score-badge { width: 50px; height: 50px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 18px; font-weight: 800; border: 2px solid; letter-spacing: -0.5px; }
  .score-big { display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 14px; font-family: var(--font-display); font-size: 28px; font-weight: 800; border: 3px solid; margin-right: 16px; flex-shrink: 0; letter-spacing: -1px; }

  /* ── CATEGORY / GENRE TAG ── */
  .category-tag { display: inline-block; width: fit-content; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 9px; border-radius: 20px; background: var(--accent-glow); color: var(--accent2); border: 1px solid var(--accent); }
  .genre-tag { display: inline-block; width: fit-content; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 9px; border-radius: 20px; background: #6c63ff22; color: var(--accent-film2); border: 1px solid #6c63ff55; }

  /* ── FLAG ── */
  .flag-disabled { position: absolute; top: 8px; right: 8px; background: #0008; border: 1px solid #ff4b6e55; color: var(--red); font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }

  /* ── GAME/MOVIE DETAIL ── */
  .detail-header { display: grid; grid-template-columns: 280px 1fr; gap: 32px; margin-bottom: 40px; }
  @media (max-width: 700px) { .detail-header { grid-template-columns: 1fr; } }
  .detail-img { width: 100%; aspect-ratio: 2/3; object-fit: cover; border-radius: var(--radius-lg); background: var(--surface2); display: flex; align-items: center; justify-content: center; font-size: 60px; overflow: hidden; }
  .detail-img img { width: 100%; height: 100%; object-fit: cover; }
  .detail-title { font-family: var(--font-display); font-size: clamp(26px, 5vw, 48px); font-weight: 800; line-height: 1.05; margin-bottom: 8px; letter-spacing: -1px; }
  .detail-meta { color: var(--muted); font-size: 14px; margin-bottom: 16px; line-height: 1.6; }
  .detail-desc { color: var(--text); line-height: 1.8; margin-bottom: 20px; font-size: 15px; }
  .platforms-list { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .platform-pill { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: var(--surface2); border: 1px solid var(--border); color: var(--muted); }

  /* ── SECTION TITLE ── */
  .section-title { font-family: var(--font-display); font-size: 20px; font-weight: 800; margin-bottom: 18px; padding-bottom: 10px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }

  /* ── REVIEW FORM ── */
  .review-form { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 28px; }
  .form-row { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
  .form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 150px; }
  .form-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); }
  .form-input, .form-select, .form-textarea { background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 10px 13px; border-radius: var(--radius); font-family: var(--font-body); font-size: 14px; transition: border-color 0.15s; }
  .form-textarea { resize: vertical; min-height: 90px; }
  .form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: var(--accent); }
  .form-input::placeholder, .form-textarea::placeholder { color: var(--muted); }

  /* ── RATING INPUT ── */
  .rating-wrap { display: flex; align-items: center; gap: 12px; }
  .rating-input { width: 88px; background: var(--surface2); border: 2px solid var(--border); color: var(--text); padding: 10px 12px; border-radius: var(--radius); font-family: var(--font-display); font-size: 24px; font-weight: 800; text-align: center; transition: border-color 0.15s; }
  .rating-input:focus { outline: none; border-color: var(--accent); }
  .rating-scale-label { font-size: 11px; color: var(--muted); font-weight: 600; line-height: 1.5; }

  /* ── REVIEW CARD ── */
  .review-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 12px; display: flex; gap: 16px; }
  .review-score { width: 52px; height: 52px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 20px; font-weight: 800; border: 2px solid; }
  .review-author { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
  .review-meta { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
  .review-text { font-size: 14px; line-height: 1.75; color: #c0c0d8; }
  .review-actions { display: flex; gap: 8px; margin-top: 10px; }

  /* ── MODAL ── */
  .modal-overlay { position: fixed; inset: 0; background: #000c; display: flex; align-items: center; justify-content: center; z-index: 500; padding: 20px; }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 28px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; }
  .modal-title { font-family: var(--font-display); font-size: 22px; font-weight: 800; margin-bottom: 22px; display: flex; align-items: center; justify-content: space-between; }
  .modal-close { background: var(--surface2); border: 1px solid var(--border); color: var(--muted); font-size: 18px; cursor: pointer; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .modal-close:hover { color: var(--text); border-color: var(--accent); }
  .modal-or { text-align: center; color: var(--muted); font-size: 13px; position: relative; margin: 18px 0; }
  .modal-or::before, .modal-or::after { content: ""; position: absolute; top: 50%; width: 42%; height: 1px; background: var(--border); }
  .modal-or::before { left: 0; } .modal-or::after { right: 0; }

  /* ── AUTH TABS ── */
  .auth-tabs { display: flex; gap: 4px; margin-bottom: 22px; background: var(--surface2); padding: 4px; border-radius: 10px; }
  .auth-tab { flex: 1; padding: 8px; border-radius: 8px; border: none; font-family: var(--font-body); font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; color: var(--muted); background: none; }
  .auth-tab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 4px #00000040; }

  /* ── ADMIN TABLE ── */
  .admin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .admin-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); font-weight: 700; padding: 8px 12px; border-bottom: 1px solid var(--border); }
  .admin-table td { padding: 12px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .admin-table tr:hover td { background: var(--surface2); }
  .admin-table .mono { font-family: monospace; font-size: 11px; color: var(--muted); }

  /* ── ADMIN SEARCH ── */
  .admin-search { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
  .admin-search-input { flex: 1; min-width: 180px; background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 8px 13px; border-radius: var(--radius); font-family: var(--font-body); font-size: 13px; }
  .admin-search-input:focus { outline: none; border-color: var(--accent); }
  .admin-search-select { background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: var(--radius); font-family: var(--font-body); font-size: 13px; cursor: pointer; }

  /* ── STATS ── */
  .stats-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
  .stat-card { flex: 1; min-width: 120px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 18px; border-top: 3px solid var(--accent); }
  .stat-value { font-family: var(--font-display); font-size: 34px; font-weight: 900; color: var(--accent2); }
  .stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; font-weight: 700; }

  /* ── ADMIN TABS ── */
  .admin-tabs { display: flex; gap: 4px; margin-bottom: 24px; flex-wrap: wrap; }
  .admin-tab { padding: 8px 16px; border-radius: var(--radius); background: none; border: 1px solid transparent; color: var(--muted); font-family: var(--font-body); font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
  .admin-tab:hover { color: var(--text); border-color: var(--border); }
  .admin-tab.active { background: var(--surface2); color: var(--accent2); border-color: var(--border); }

  /* ── BACK BTN ── */
  .back-btn { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 13px; font-weight: 700; background: none; border: none; cursor: pointer; margin-bottom: 24px; transition: color 0.15s; padding: 0; }
  .back-btn:hover { color: var(--accent2); }

  /* ── EMPTY ── */
  .empty { text-align: center; padding: 60px 20px; color: var(--muted); }
  .empty-icon { font-size: 48px; margin-bottom: 12px; }
  .empty-text { font-size: 16px; font-weight: 600; }

  /* ── TOAST ── */
  .toast { position: fixed; bottom: 24px; right: 24px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px 20px; font-size: 14px; z-index: 999; box-shadow: 0 8px 32px #00000080; animation: slideUp 0.3s ease; max-width: 320px; font-weight: 600; }
  .toast.success { border-left: 4px solid var(--green); }
  .toast.error   { border-left: 4px solid var(--red); }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  /* ── LOADING ── */
  .loading { display: flex; align-items: center; justify-content: center; height: 200px; color: var(--muted); font-size: 15px; gap: 10px; font-weight: 600; }
  .spinner { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border); border-top-color: var(--accent); animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── CRUD INLINE ── */
  .crud-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .crud-item { display: flex; align-items: center; gap: 10px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 14px; }
  .crud-item-name { flex: 1; font-size: 14px; font-weight: 600; }
  .crud-item-id { font-family: monospace; font-size: 10px; color: var(--muted); }
  .crud-add-row { display: flex; gap: 10px; margin-top: 10px; }

  /* ── CHANGE PW ── */
  .change-pw-form { display: flex; flex-direction: column; gap: 14px; }

  /* ── SELECTABLE TEXT ── */
  .review-text, .detail-desc, .detail-meta, .review-author, .review-meta { cursor: text; user-select: text; }
`;

// ─────────────────────────────────────────────
// HOOKS
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
// SMALL COMPONENTS
// ─────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast ${toast.type}`}>{toast.msg}</div>;
}

function Spinner() {
  return <div className="loading"><div className="spinner" /> Carregando...</div>;
}

function ScoreBadge({ score, size = "sm" }) {
  const color = scoreColor(score);
  const cls = size === "lg" ? "score-big" : "score-badge";
  return <div className={cls} style={{ borderColor: color, color }}>{score ?? "—"}</div>;
}

function UserAvatar({ user, size = 28 }) {
  if (user?.photoURL) return <img src={user.photoURL} className="user-avatar" style={{ width: size, height: size }} alt="" />;
  const letter = (user?.displayName || user?.name || "?")[0].toUpperCase();
  return <div className="user-avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.44 }}>{letter}</div>;
}

// ─────────────────────────────────────────────
// RATING INPUT — with smart auto-format
// ─────────────────────────────────────────────

function RatingInput({ value, onChange, isFilm = false }) {
  function handleChange(e) {
    const raw = e.target.value;
    const formatted = smartRating(raw);
    onChange(formatted);
  }
  return (
    <div className="form-group" style={{ maxWidth: 200 }}>
      <label className="form-label">Nota (0 – 10)</label>
      <div className="rating-wrap">
        <input
          className="rating-input"
          type="number" min="0" max="10" step="0.1"
          placeholder="7.5"
          value={value}
          onChange={handleChange}
          style={{ borderColor: isFilm ? "var(--accent-film)" : undefined }}
        />
        <span className="rating-scale-label">Escala 0 – 10<br/>Ex: 7.5 · 8.3</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AUTH MODAL
// ─────────────────────────────────────────────

function AuthModal({ onClose, toast }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", password2: "" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleGoogle() {
    setLoading(true);
    try { await loginWithGoogle(); toast.show("Login realizado!"); onClose(); }
    catch (e) { toast.show("Erro: " + e.message, "error"); }
    finally { setLoading(false); }
  }

  async function handleEmail() {
    if (tab === "register" && form.password !== form.password2) { toast.show("As senhas não coincidem", "error"); return; }
    if (!form.email || !form.password) { toast.show("Preencha todos os campos", "error"); return; }
    setLoading(true);
    try {
      if (tab === "login") { await loginWithEmail(form.email, form.password); toast.show("Login realizado!"); }
      else {
        if (!form.username.trim()) { toast.show("Digite um username", "error"); setLoading(false); return; }
        await registerWithEmail(form.username.trim(), form.email, form.password);
        toast.show("Conta criada com sucesso!");
      }
      onClose();
    } catch (e) {
      const msg = e.code === "auth/user-not-found" || e.code === "auth/wrong-password" ? "Email ou senha incorretos"
        : e.code === "auth/email-already-in-use" ? "Este email já está cadastrado" : e.message;
      toast.show(msg, "error");
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Entrar no GameVault<button className="modal-close" onClick={onClose}>×</button></div>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Login</button>
          <button className={`auth-tab ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>Cadastrar</button>
        </div>
        {tab === "register" && (
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Username</label>
            <input className="form-input" placeholder="Seu username" value={form.username} onChange={e => set("username", e.target.value)} />
          </div>
        )}
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Email</label>
          <input className="form-input" type="email" placeholder="seu@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: tab === "register" ? 12 : 18 }}>
          <label className="form-label">Senha</label>
          <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => set("password", e.target.value)} onKeyDown={e => e.key === "Enter" && handleEmail()} />
        </div>
        {tab === "register" && (
          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label">Confirmar senha</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password2} onChange={e => set("password2", e.target.value)} />
          </div>
        )}
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleEmail} disabled={loading}>
          {loading ? "Aguarde..." : tab === "login" ? "Entrar" : "Criar conta"}
        </button>
        <div className="modal-or">ou</div>
        <button className="btn-google" style={{ width: "100%", justifyContent: "center" }} onClick={handleGoogle} disabled={loading}>
          <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continuar com Google
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CHANGE PASSWORD MODAL
// ─────────────────────────────────────────────

function ChangePasswordModal({ onClose, toast, userProfile }) {
  const [form, setForm] = useState({ current: "", next: "", next2: "" });
  const [loading, setLoading] = useState(false);
  const isGoogle = userProfile?.provider === "google";

  async function handleSubmit() {
    if (form.next !== form.next2) { toast.show("As senhas não coincidem", "error"); return; }
    if (form.next.length < 6) { toast.show("A nova senha precisa ter ao menos 6 caracteres", "error"); return; }
    setLoading(true);
    try { await changePassword(form.current, form.next); toast.show("Senha alterada com sucesso!"); onClose(); }
    catch (e) { toast.show("Senha atual incorreta", "error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Alterar Senha<button className="modal-close" onClick={onClose}>×</button></div>
        {isGoogle ? (
          <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>Sua conta usa login pelo Google. A senha é gerenciada pelo Google e não pode ser alterada aqui.</div>
        ) : (
          <div className="change-pw-form">
            <div className="form-group"><label className="form-label">Senha atual</label><input className="form-input" type="password" placeholder="••••••••" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Nova senha</label><input className="form-input" type="password" placeholder="••••••••" value={form.next} onChange={e => setForm(f => ({ ...f, next: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Confirmar nova senha</label><input className="form-input" type="password" placeholder="••••••••" value={form.next2} onChange={e => setForm(f => ({ ...f, next2: e.target.value }))} /></div>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? "Salvando..." : "Alterar senha"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HAMBURGER DRAWER
// ─────────────────────────────────────────────

function HamburgerDrawer({ open, onClose, currentUser, userProfile, onLogout, onChangePw, onAdmin }) {
  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin";
  if (!open && !currentUser) return null;
  return (
    <>
      <div className={`drawer-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`drawer ${open ? "open" : ""}`}>
        <div className="drawer-header">
          <span className="drawer-title">Menu</span>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body">
          {currentUser && (
            <>
              <div className="drawer-user">
                <UserAvatar user={currentUser} size={36} />
                <div className="drawer-user-info">
                  <div className="drawer-user-name">{userProfile?.username || userProfile?.name || currentUser.displayName}</div>
                  <div className="drawer-user-role">{userProfile?.role || "usuário"}</div>
                </div>
              </div>
              <div className="drawer-separator" />
              <button className="drawer-item" onClick={() => { onChangePw(); onClose(); }}><span className="di-icon">—</span> Alterar senha</button>
              {isAdmin && <button className="drawer-item" onClick={() => { onAdmin(); onClose(); }}><span className="di-icon">—</span> Painel de Administração</button>}
              <div className="drawer-separator" />
              <button className="drawer-item" style={{ color: "var(--red)" }} onClick={() => { onLogout(); onClose(); }}><span className="di-icon">—</span> Sair da conta</button>
            </>
          )}
          {!currentUser && <div style={{ color: "var(--muted)", fontSize: 14, padding: "12px 14px" }}>Faça login para acessar o menu.</div>}
        </div>
        <div className="drawer-footer" style={{ color: "var(--muted)", fontSize: 11, textAlign: "center" }}>GameVault v3.0</div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// GAME FORM MODAL
// ─────────────────────────────────────────────

function GameFormModal({ game, categories, platforms, onClose, onSave, toast }) {
  const [form, setForm] = useState({
    title: game?.title || "", description: game?.description || "",
    category: game?.category || "", developer: game?.developer || "",
    publisher: game?.publisher || "", releaseYear: game?.releaseYear || new Date().getFullYear(),
    platforms: game?.platforms || [], image: game?.image || "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const togglePlatform = (name) => setForm(f => ({
    ...f, platforms: f.platforms.includes(name) ? f.platforms.filter(x => x !== name) : [...f.platforms, name],
  }));

  async function handleSubmit() {
    if (!form.title.trim()) { toast.show("Título obrigatório", "error"); return; }
    setSaving(true);
    try { await onSave(form, imageFile); onClose(); }
    catch (e) { toast.show("Erro: " + e.message, "error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{game ? "Editar Jogo" : "Novo Jogo"}<button className="modal-close" onClick={onClose}>×</button></div>
        <div className="form-group" style={{ marginBottom: 12 }}><label className="form-label">Título *</label><input className="form-input" value={form.title} onChange={e => set("title", e.target.value)} /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Categoria</label><select className="form-select" value={form.category} onChange={e => set("category", e.target.value)}><option value="">Selecione...</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Ano</label><input className="form-input" type="number" value={form.releaseYear} onChange={e => set("releaseYear", Number(e.target.value))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Desenvolvedor</label><input className="form-input" value={form.developer} onChange={e => set("developer", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Publisher</label><input className="form-input" value={form.publisher} onChange={e => set("publisher", e.target.value)} /></div>
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}><label className="form-label">Descrição</label><textarea className="form-textarea" value={form.description} onChange={e => set("description", e.target.value)} /></div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Plataformas</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {platforms.map(p => <button key={p.id} type="button" className={`btn btn-sm ${form.platforms.includes(p.name) ? "btn-primary" : "btn-secondary"}`} onClick={() => togglePlatform(p.name)}>{p.name}</button>)}
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}><label className="form-label">Upload de imagem</label><input type="file" accept="image/*" style={{ color: "var(--text)", fontSize: 13 }} onChange={e => setImageFile(e.target.files[0])} /></div>
        <div className="form-group" style={{ marginBottom: 20 }}><label className="form-label">Ou URL da imagem</label><input className="form-input" value={form.image} placeholder="https://..." onChange={e => set("image", e.target.value)} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MOVIE FORM MODAL
// ─────────────────────────────────────────────

function MovieFormModal({ movie, genres, onClose, onSave, toast }) {
  const [form, setForm] = useState({
    title: movie?.title || "", synopsis: movie?.synopsis || "",
    director: movie?.director || "", writer: movie?.writer || "",
    genre: movie?.genre || "", releaseYear: movie?.releaseYear || new Date().getFullYear(),
    image: movie?.image || "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit() {
    if (!form.title.trim()) { toast.show("Título obrigatório", "error"); return; }
    setSaving(true);
    try { await onSave(form, imageFile); onClose(); }
    catch (e) { toast.show("Erro: " + e.message, "error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ color: "var(--accent-film2)" }}>{movie ? "Editar Filme" : "Novo Filme"}<button className="modal-close" onClick={onClose}>×</button></div>
        <div className="form-group" style={{ marginBottom: 12 }}><label className="form-label">Título *</label><input className="form-input" value={form.title} onChange={e => set("title", e.target.value)} /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Dirigido por</label><input className="form-input" value={form.director} onChange={e => set("director", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Escrito por</label><input className="form-input" value={form.writer} onChange={e => set("writer", e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Gênero</label><select className="form-select" value={form.genre} onChange={e => set("genre", e.target.value)}><option value="">Selecione...</option>{genres.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Ano</label><input className="form-input" type="number" value={form.releaseYear} onChange={e => set("releaseYear", Number(e.target.value))} /></div>
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}><label className="form-label">Sinopse</label><textarea className="form-textarea" value={form.synopsis} onChange={e => set("synopsis", e.target.value)} /></div>
        <div className="form-group" style={{ marginBottom: 12 }}><label className="form-label">Upload de imagem (capa)</label><input type="file" accept="image/*" style={{ color: "var(--text)", fontSize: 13 }} onChange={e => setImageFile(e.target.files[0])} /></div>
        <div className="form-group" style={{ marginBottom: 20 }}><label className="form-label">Ou URL da imagem</label><input className="form-input" value={form.image} placeholder="https://..." onChange={e => set("image", e.target.value)} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary-film" onClick={handleSubmit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// GAME DETAIL PAGE
// ─────────────────────────────────────────────

function GameDetailPage({ game, currentUser, userProfile, onBack, onDataChange, toast }) {
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ rating: "", platform: "", text: "" });
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin";
  const isBanned = userProfile?.banned;

  useEffect(() => { load(); }, [game.id]);

  async function load() {
    setLoading(true);
    const data = await getReviewsByGame(game.id);
    setReviews(data);
    if (currentUser) {
      const mine = data.find(r => r.userId === currentUser.uid);
      setMyReview(mine || null);
      if (mine) setForm({ rating: mine.rating, platform: mine.platform, text: mine.text });
    }
    setLoading(false);
  }

  const score = avg(reviews);

  function validateRating(val) {
    const n = parseFloat(val);
    return !isNaN(n) && n >= 0 && n <= 10;
  }

  async function handleSubmit() {
    const ratingVal = smartRating(String(form.rating));
    if (!validateRating(ratingVal)) { toast.show("Nota deve ser entre 0 e 10 (ex: 7.5)", "error"); return; }
    if (!form.platform) { toast.show("Selecione a plataforma", "error"); return; }
    if (!form.text.trim()) { toast.show("Escreva um comentário", "error"); return; }
    setSubmitting(true);
    try {
      await upsertReview(currentUser.uid, game.id, {
        rating: parseFloat(parseFloat(ratingVal).toFixed(1)),
        platform: form.platform, text: form.text,
        userName: userProfile?.username || currentUser.displayName,
        userPhoto: currentUser.photoURL,
      });
      toast.show("Avaliação salva!");
      setEditing(false); await load(); onDataChange();
    } catch (e) { toast.show("Erro: " + e.message, "error"); }
    finally { setSubmitting(false); }
  }

  async function handleDeleteReview(id) {
    if (!window.confirm("Excluir esta avaliação?")) return;
    await deleteReview(id); toast.show("Avaliação excluída"); await load(); onDataChange();
  }

  const availablePlatforms = game.platforms || [];

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Voltar</button>
      <div className="detail-header">
        <div className="detail-img">{game.image ? <img src={game.image} alt={game.title} /> : "🎮"}</div>
        <div>
          {isAdmin && <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace", marginBottom: 6 }}>ID: {game.id}</div>}
          {game.category && <span className="category-tag">{game.category}</span>}
          <div className="detail-title" style={{ marginTop: 8 }}>{game.title}</div>
          <div className="detail-meta">{game.developer}{game.publisher ? ` · ${game.publisher}` : ""}{game.releaseYear ? ` · ${game.releaseYear}` : ""}</div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <ScoreBadge score={score} size="lg" />
            <div>
              <div style={{ fontSize: 14, color: "var(--muted)", fontWeight: 600 }}>{reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Escala 0 – 10</div>
            </div>
          </div>
          {game.description && <div className="detail-desc">{game.description}</div>}
          <div className="platforms-list">{availablePlatforms.map(p => <span key={p} className="platform-pill">{p}</span>)}</div>
          {!game.reviewsEnabled && <div style={{ marginTop: 12, color: "var(--red)", fontSize: 13, fontWeight: 700 }}>Avaliações desabilitadas para este jogo</div>}
        </div>
      </div>

      {!currentUser && <div className="review-form" style={{ textAlign: "center", color: "var(--muted)" }}>Faça login para avaliar este jogo.</div>}
      {currentUser && isBanned && <div className="review-form" style={{ textAlign: "center", color: "var(--red)" }}>Sua conta está banida.</div>}
      {currentUser && !isBanned && game.reviewsEnabled && (!myReview || editing) && (
        <div className="review-form">
          <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>{editing ? "Editar Avaliação" : "Escrever Avaliação"}</div>
          <div className="form-row">
            <RatingInput value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
            <div className="form-group">
              <label className="form-label">Plataforma</label>
              <select className="form-select" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                <option value="">Selecione...</option>
                {availablePlatforms.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Comentário</label>
            <textarea className="form-textarea" placeholder="O que você achou do jogo?" value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? "Publicando..." : editing ? "Salvar" : "Publicar"}</button>
            {editing && <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancelar</button>}
          </div>
        </div>
      )}
      {myReview && !editing && (
        <div style={{ marginBottom: 20, padding: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Você já avaliou este jogo.</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Editar</button>
        </div>
      )}

      <div className="section-title">Avaliações ({reviews.length})</div>
      {loading ? <Spinner /> : reviews.length === 0 ? (
        <div className="empty"><div className="empty-icon">💬</div><div className="empty-text">Nenhuma avaliação ainda</div></div>
      ) : reviews.map(r => {
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
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteReview(r.id)}>Excluir</button>
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
// MOVIE DETAIL PAGE
// ─────────────────────────────────────────────

function MovieDetailPage({ movie, currentUser, userProfile, onBack, onDataChange, toast }) {
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ rating: "", text: "" });
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin";
  const isBanned = userProfile?.banned;

  useEffect(() => { load(); }, [movie.id]);

  async function load() {
    setLoading(true);
    const data = await getReviewsByMovie(movie.id);
    setReviews(data);
    if (currentUser) {
      const mine = data.find(r => r.userId === currentUser.uid);
      setMyReview(mine || null);
      if (mine) setForm({ rating: mine.rating, text: mine.text });
    }
    setLoading(false);
  }

  const score = avg(reviews);

  function validateRating(val) {
    const n = parseFloat(val);
    return !isNaN(n) && n >= 0 && n <= 10;
  }

  async function handleSubmit() {
    const ratingVal = smartRating(String(form.rating));
    if (!validateRating(ratingVal)) { toast.show("Nota deve ser entre 0 e 10 (ex: 7.5)", "error"); return; }
    if (!form.text.trim()) { toast.show("Escreva um comentário", "error"); return; }
    setSubmitting(true);
    try {
      await upsertMovieReview(currentUser.uid, movie.id, {
        rating: parseFloat(parseFloat(ratingVal).toFixed(1)),
        text: form.text,
        userName: userProfile?.username || currentUser.displayName,
        userPhoto: currentUser.photoURL,
      });
      toast.show("Avaliação salva!");
      setEditing(false); await load(); onDataChange();
    } catch (e) { toast.show("Erro: " + e.message, "error"); }
    finally { setSubmitting(false); }
  }

  async function handleDeleteReview(id) {
    if (!window.confirm("Excluir esta avaliação?")) return;
    await deleteReview(id); toast.show("Avaliação excluída"); await load(); onDataChange();
  }

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Voltar</button>
      <div className="detail-header">
        <div className="detail-img">{movie.image ? <img src={movie.image} alt={movie.title} /> : "🎬"}</div>
        <div>
          {isAdmin && <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace", marginBottom: 6 }}>ID: {movie.id}</div>}
          {movie.genre && <span className="genre-tag">{movie.genre}</span>}
          <div className="detail-title" style={{ marginTop: 8 }}>{movie.title}</div>
          <div className="detail-meta" style={{ cursor: "text", userSelect: "text" }}>
            {movie.director && <span>Direção: {movie.director}</span>}
            {movie.writer && <><br /><span>Roteiro: {movie.writer}</span></>}
            {movie.releaseYear && <><br /><span>{movie.releaseYear}</span></>}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <ScoreBadge score={score} size="lg" />
            <div>
              <div style={{ fontSize: 14, color: "var(--muted)", fontWeight: 600 }}>{reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Escala 0 – 10</div>
            </div>
          </div>
          {movie.synopsis && <div className="detail-desc">{movie.synopsis}</div>}
        </div>
      </div>

      {!currentUser && <div className="review-form" style={{ textAlign: "center", color: "var(--muted)" }}>Faça login para avaliar este filme.</div>}
      {currentUser && isBanned && <div className="review-form" style={{ textAlign: "center", color: "var(--red)" }}>Sua conta está banida.</div>}
      {currentUser && !isBanned && (!myReview || editing) && (
        <div className="review-form" style={{ borderColor: "var(--accent-film)" }}>
          <div className="section-title" style={{ fontSize: 16, marginBottom: 16, color: "var(--accent-film2)" }}>{editing ? "Editar Avaliação" : "Escrever Avaliação"}</div>
          <div className="form-row">
            <RatingInput value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} isFilm />
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Comentário</label>
            <textarea className="form-textarea" placeholder="O que você achou do filme?" value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary-film" onClick={handleSubmit} disabled={submitting}>{submitting ? "Publicando..." : editing ? "Salvar" : "Publicar"}</button>
            {editing && <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancelar</button>}
          </div>
        </div>
      )}
      {myReview && !editing && (
        <div style={{ marginBottom: 20, padding: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Você já avaliou este filme.</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Editar</button>
        </div>
      )}

      <div className="section-title">Avaliações ({reviews.length})</div>
      {loading ? <Spinner /> : reviews.length === 0 ? (
        <div className="empty"><div className="empty-icon">💬</div><div className="empty-text">Nenhuma avaliação ainda</div></div>
      ) : reviews.map(r => {
        const color = scoreColor(r.rating);
        const isMine = currentUser && r.userId === currentUser.uid;
        return (
          <div key={r.id} className="review-card" style={{ borderColor: "var(--border)" }}>
            <div className="review-score" style={{ borderColor: color, color }}>{r.rating}</div>
            <div style={{ flex: 1 }}>
              <div className="review-author">{r.userName}</div>
              <div className="review-meta">{r.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—"}</div>
              <div className="review-text">{r.text}</div>
              {(isMine || isAdmin) && (
                <div className="review-actions">
                  {isMine && <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Editar</button>}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteReview(r.id)}>Excluir</button>
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

function AdminPanel({ currentUser, userProfile, games, movies, allReviews, allMovieReviews, categories, platforms, genres, toast, onDataChange, onViewGame, onViewMovie }) {
  const [tab, setTab] = useState("games");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showGameForm, setShowGameForm] = useState(false);
  const [editGame, setEditGame] = useState(null);
  const [showMovieForm, setShowMovieForm] = useState(false);
  const [editMovie, setEditMovie] = useState(null);

  const [gSearch, setGSearch] = useState(""); const [gCat, setGCat] = useState(""); const [gPlat, setGPlat] = useState("");
  const [mSearch, setMSearch] = useState(""); const [mGenre, setMGenre] = useState("");
  const [rSearch, setRSearch] = useState(""); const [rPlat, setRPlat] = useState("");
  const [mrSearch, setMrSearch] = useState("");
  const [uSearch, setUSearch] = useState("");
  const [newCat, setNewCat] = useState(""); const [newPlat, setNewPlat] = useState(""); const [newGenre, setNewGenre] = useState("");
  const [editCat, setEditCat] = useState(null); const [editPlat, setEditPlat] = useState(null); const [editGenre, setEditGenre] = useState(null);

  const isSuperAdmin = userProfile?.role === "superadmin";

  useEffect(() => { if (tab === "users") loadUsers(); }, [tab]);
  async function loadUsers() { setLoadingUsers(true); const data = await getAllUsers(); setUsers(data); setLoadingUsers(false); }

  async function handleCreateGame(data, img) { await createGame(data, img); toast.show("Jogo criado!"); onDataChange(); }
  async function handleUpdateGame(data, img) { await updateGame(editGame.id, data, img); toast.show("Jogo atualizado!"); onDataChange(); }
  async function handleDeleteGame(g) { if (!window.confirm(`Excluir "${g.title}"?`)) return; await deleteGame(g.id); toast.show("Jogo excluído"); onDataChange(); }
  async function handleToggleReviews(g) { await updateGame(g.id, { reviewsEnabled: !g.reviewsEnabled }); toast.show(g.reviewsEnabled ? "Avaliações desativadas" : "Avaliações ativadas"); onDataChange(); }

  async function handleCreateMovie(data, img) { await createMovie(data, img); toast.show("Filme criado!"); onDataChange(); }
  async function handleUpdateMovie(data, img) { await updateMovie(editMovie.id, data, img); toast.show("Filme atualizado!"); onDataChange(); }
  async function handleDeleteMovie(m) { if (!window.confirm(`Excluir "${m.title}"?`)) return; await deleteMovie(m.id); toast.show("Filme excluído"); onDataChange(); }

  async function handleBan(u) { if (!window.confirm(`${u.banned ? "Desbanir" : "Banir"} ${u.name}?`)) return; await updateUser(u.id, { banned: !u.banned }); toast.show(`Usuário ${u.banned ? "desbanido" : "banido"}`); loadUsers(); }
  async function handlePromote(u) { if (!window.confirm(`Promover ${u.name} a admin?`)) return; await updateUser(u.id, { role: "admin" }); toast.show("Promovido"); loadUsers(); }
  async function handleDemote(u) { if (!isSuperAdmin) { toast.show("Apenas o superadmin pode rebaixar admins", "error"); return; } if (!window.confirm(`Rebaixar ${u.name}?`)) return; await updateUser(u.id, { role: "user" }); toast.show("Rebaixado"); loadUsers(); }

  async function handleCreateCat() { if (!newCat.trim()) return; await createCategory(newCat.trim()); setNewCat(""); toast.show("Categoria criada"); onDataChange(); }
  async function handleUpdateCat(id, name) { await updateCategory(id, name); setEditCat(null); toast.show("Categoria atualizada"); onDataChange(); }
  async function handleDeleteCat(id) { if (!window.confirm("Excluir categoria?")) return; await deleteCategory(id); toast.show("Categoria excluída"); onDataChange(); }
  async function handleCreatePlat() { if (!newPlat.trim()) return; await createPlatform(newPlat.trim()); setNewPlat(""); toast.show("Plataforma criada"); onDataChange(); }
  async function handleUpdatePlat(id, name) { await updatePlatform(id, name); setEditPlat(null); toast.show("Plataforma atualizada"); onDataChange(); }
  async function handleDeletePlat(id) { if (!window.confirm("Excluir plataforma?")) return; await deletePlatform(id); toast.show("Plataforma excluída"); onDataChange(); }
  async function handleCreateGenre() { if (!newGenre.trim()) return; await createGenre(newGenre.trim()); setNewGenre(""); toast.show("Gênero criado"); onDataChange(); }
  async function handleUpdateGenre(id, name) { await updateGenre(id, name); setEditGenre(null); toast.show("Gênero atualizado"); onDataChange(); }
  async function handleDeleteGenre(id) { if (!window.confirm("Excluir gênero?")) return; await deleteGenre(id); toast.show("Gênero excluído"); onDataChange(); }

  const gamesWithVid   = games.map((g, i) => ({ ...g, _vid: `G${i+1}` }));
  const moviesWithVid  = movies.map((m, i) => ({ ...m, _vid: `F${i+1}` }));
  const reviewsWithVid = allReviews.map((r, i) => ({ ...r, _vid: `R${i+1}` }));
  const mReviewsWithVid = allMovieReviews.map((r, i) => ({ ...r, _vid: `MR${i+1}` }));
  const usersWithVid   = users.map((u, i) => ({ ...u, _vid: `U${i+1}` }));

  const filteredGames   = gamesWithVid.filter(g => { const s = gSearch.toLowerCase(); return (!s || g.title?.toLowerCase().includes(s) || g._vid.toLowerCase().includes(s)) && (!gCat || g.category === gCat) && (!gPlat || g.platforms?.includes(gPlat)); });
  const filteredMovies  = moviesWithVid.filter(m => { const s = mSearch.toLowerCase(); return (!s || m.title?.toLowerCase().includes(s) || m._vid.toLowerCase().includes(s)) && (!mGenre || m.genre === mGenre); });
  const filteredReviews = reviewsWithVid.filter(r => { const s = rSearch.toLowerCase(); const g = games.find(x => x.id === r.gameId); return (!s || r.userName?.toLowerCase().includes(s) || g?.title?.toLowerCase().includes(s) || r._vid.toLowerCase().includes(s)) && (!rPlat || r.platform === rPlat); });
  const filteredMReviews = mReviewsWithVid.filter(r => { const s = mrSearch.toLowerCase(); const m = movies.find(x => x.id === r.movieId); return !s || r.userName?.toLowerCase().includes(s) || m?.title?.toLowerCase().includes(s) || r._vid.toLowerCase().includes(s); });
  const filteredUsers   = usersWithVid.filter(u => { const s = uSearch.toLowerCase(); return !s || u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u._vid.toLowerCase().includes(s) || u.username?.toLowerCase().includes(s); });

  const totalReviews = allReviews.length + allMovieReviews.length;

  const TABS = ["games","movies","reviews","movie-reviews","users","categories","platforms","genres"];
  const TAB_LABELS = { games:"Jogos", movies:"Filmes", reviews:"Avaliações (Games)", "movie-reviews":"Avaliações (Filmes)", users:"Usuários", categories:"Categorias", platforms:"Plataformas", genres:"Gêneros" };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, marginBottom: 4 }}>Painel de Administração</div>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>Logado como <strong>{userProfile?.name}</strong> · <span className={`role-badge role-${userProfile?.role}`}>{userProfile?.role}</span></div>
      </div>

      <div className="stats-row">
        <div className="stat-card"><div className="stat-value">{games.length}</div><div className="stat-label">Jogos</div></div>
        <div className="stat-card"><div className="stat-value">{movies.length}</div><div className="stat-label">Filmes</div></div>
        <div className="stat-card"><div className="stat-value">{totalReviews}</div><div className="stat-label">Avaliações</div></div>
        <div className="stat-card"><div className="stat-value">{categories.length}</div><div className="stat-label">Categorias</div></div>
        <div className="stat-card"><div className="stat-value">{platforms.length}</div><div className="stat-label">Plataformas</div></div>
        <div className="stat-card"><div className="stat-value">{genres.length}</div><div className="stat-label">Gêneros</div></div>
      </div>

      <div className="admin-tabs">
        {TABS.map(t => <button key={t} className={`admin-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{TAB_LABELS[t]}</button>)}
      </div>

      {/* GAMES */}
      {tab === "games" && (
        <div>
          <div className="admin-search">
            <input className="admin-search-input" placeholder="Buscar por nome ou ID..." value={gSearch} onChange={e => setGSearch(e.target.value)} />
            <select className="admin-search-select" value={gCat} onChange={e => setGCat(e.target.value)}><option value="">Todas as categorias</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
            <select className="admin-search-select" value={gPlat} onChange={e => setGPlat(e.target.value)}><option value="">Todas as plataformas</option>{platforms.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditGame(null); setShowGameForm(true); }}>+ Novo Jogo</button>
          </div>
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Título</th><th>Categoria</th><th>Plataformas</th><th>Avaliações</th><th>Reviews</th><th>Ações</th></tr></thead>
            <tbody>
              {filteredGames.map(g => {
                const gr = allReviews.filter(r => r.gameId === g.id);
                const sc = avg(gr);
                return (
                  <tr key={g.id}>
                    <td className="mono">{g._vid}</td>
                    <td style={{ fontWeight: 700 }}>{g.title}</td>
                    <td><span className="category-tag">{g.category}</span></td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{g.platforms?.join(", ")}</td>
                    <td><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><ScoreBadge score={sc} /><span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{gr.length} {gr.length === 1 ? "aval." : "avals."}</span></div></td>
                    <td><span style={{ fontSize: 12, fontWeight: 700, color: g.reviewsEnabled ? "var(--green)" : "var(--red)" }}>{g.reviewsEnabled ? "ON" : "OFF"}</span></td>
                    <td><div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setEditGame(g); setShowGameForm(true); }}>Editar</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleToggleReviews(g)}>{g.reviewsEnabled ? "Desativar" : "Ativar"}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteGame(g)}>Excluir</button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MOVIES */}
      {tab === "movies" && (
        <div>
          <div className="admin-search">
            <input className="admin-search-input" placeholder="Buscar por nome ou ID..." value={mSearch} onChange={e => setMSearch(e.target.value)} />
            <select className="admin-search-select" value={mGenre} onChange={e => setMGenre(e.target.value)}><option value="">Todos os gêneros</option>{genres.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}</select>
            <button className="btn btn-primary-film btn-sm" onClick={() => { setEditMovie(null); setShowMovieForm(true); }}>+ Novo Filme</button>
          </div>
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Título</th><th>Direção</th><th>Gênero</th><th>Avaliações</th><th>Ações</th></tr></thead>
            <tbody>
              {filteredMovies.map(m => {
                const mr = allMovieReviews.filter(r => r.movieId === m.id);
                const sc = avg(mr);
                return (
                  <tr key={m.id}>
                    <td className="mono">{m._vid}</td>
                    <td style={{ fontWeight: 700 }}>{m.title}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{m.director || "—"}</td>
                    <td>{m.genre && <span className="genre-tag">{m.genre}</span>}</td>
                    <td><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><ScoreBadge score={sc} /><span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{mr.length} {mr.length === 1 ? "aval." : "avals."}</span></div></td>
                    <td><div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setEditMovie(m); setShowMovieForm(true); }}>Editar</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => onViewMovie(m)}>Visualizar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMovie(m)}>Excluir</button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* GAME REVIEWS */}
      {tab === "reviews" && (
        <div>
          <div className="admin-search">
            <input className="admin-search-input" placeholder="Buscar por usuário, jogo ou ID..." value={rSearch} onChange={e => setRSearch(e.target.value)} />
            <select className="admin-search-select" value={rPlat} onChange={e => setRPlat(e.target.value)}><option value="">Todas as plataformas</option>{platforms.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select>
          </div>
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Jogo</th><th>Usuário</th><th>Nota</th><th>Plataforma</th><th>Data</th><th>Ações</th></tr></thead>
            <tbody>
              {filteredReviews.map(r => {
                const game = games.find(g => g.id === r.gameId);
                return (
                  <tr key={r.id}>
                    <td className="mono">{r._vid}</td>
                    <td>{game?.title || "—"}</td>
                    <td>{r.userName}</td>
                    <td><ScoreBadge score={r.rating} /></td>
                    <td>{r.platform}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{r.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—"}</td>
                    <td><div style={{ display: "flex", gap: 6 }}>
                      {game && <button className="btn btn-secondary btn-sm" onClick={() => onViewGame(game)}>Visualizar</button>}
                      <button className="btn btn-danger btn-sm" onClick={async () => { if (!window.confirm("Excluir avaliação?")) return; await deleteReview(r.id); toast.show("Excluída"); onDataChange(); }}>Excluir</button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MOVIE REVIEWS */}
      {tab === "movie-reviews" && (
        <div>
          <div className="admin-search">
            <input className="admin-search-input" placeholder="Buscar por usuário, filme ou ID..." value={mrSearch} onChange={e => setMrSearch(e.target.value)} />
          </div>
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Filme</th><th>Usuário</th><th>Nota</th><th>Data</th><th>Ações</th></tr></thead>
            <tbody>
              {filteredMReviews.map(r => {
                const movie = movies.find(m => m.id === r.movieId);
                return (
                  <tr key={r.id}>
                    <td className="mono">{r._vid}</td>
                    <td>{movie?.title || "—"}</td>
                    <td>{r.userName}</td>
                    <td><ScoreBadge score={r.rating} /></td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{r.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—"}</td>
                    <td><div style={{ display: "flex", gap: 6 }}>
                      {movie && <button className="btn btn-secondary btn-sm" onClick={() => onViewMovie(movie)}>Visualizar</button>}
                      <button className="btn btn-danger btn-sm" onClick={async () => { if (!window.confirm("Excluir avaliação?")) return; await deleteReview(r.id); toast.show("Excluída"); onDataChange(); }}>Excluir</button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* USERS */}
      {tab === "users" && (
        loadingUsers ? <Spinner /> : (
          <div>
            <div className="admin-search"><input className="admin-search-input" placeholder="Buscar por nome, username, email ou ID..." value={uSearch} onChange={e => setUSearch(e.target.value)} /></div>
            <table className="admin-table">
              <thead><tr><th>ID</th><th>Nome/Username</th><th>Email</th><th>Role</th><th>Status</th><th>Desde</th><th>Ações</th></tr></thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td className="mono">{u._vid}</td>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {u.photo ? <img src={u.photo} className="user-avatar" style={{ width: 26, height: 26 }} alt="" /> : <div className="user-avatar-placeholder" style={{ width: 26, height: 26, fontSize: 11 }}>{(u.name||"?")[0]}</div>}
                      <div><div style={{ fontWeight: 700, fontSize: 13 }}>{u.username || u.name}</div>{u.username && u.name !== u.username && <div style={{ fontSize: 11, color: "var(--muted)" }}>{u.name}</div>}</div>
                    </div></td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{u.email}</td>
                    <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                    <td><span style={{ fontSize: 12, fontWeight: 700, color: u.banned ? "var(--red)" : "var(--green)" }}>{u.banned ? "Banido" : "Ativo"}</span></td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{u.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—"}</td>
                    <td><div style={{ display: "flex", gap: 6 }}>
                      {u.role === "user" && u.id !== currentUser.uid && <button className="btn btn-secondary btn-sm" onClick={() => handlePromote(u)}>Promover</button>}
                      {u.role === "admin" && isSuperAdmin && u.id !== currentUser.uid && <button className="btn btn-secondary btn-sm" onClick={() => handleDemote(u)}>Rebaixar</button>}
                      {u.id !== currentUser.uid && u.role !== "superadmin" && <button className={`btn btn-sm ${u.banned ? "btn-secondary" : "btn-danger"}`} onClick={() => handleBan(u)}>{u.banned ? "Desbanir" : "Banir"}</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* CATEGORIES */}
      {tab === "categories" && (
        <div>
          <div className="crud-list">{categories.map((c, idx) => (
            <div key={c.id} className="crud-item">
              <div style={{ flex: 1 }}>
                {editCat?.id === c.id ? <input className="form-input" style={{ padding: "6px 10px", fontSize: 13 }} value={editCat.name} onChange={e => setEditCat({ ...editCat, name: e.target.value })} /> : <span className="crud-item-name">{c.name}</span>}
                <div className="crud-item-id">ID: C{idx+1}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {editCat?.id === c.id ? (<><button className="btn btn-primary btn-sm" onClick={() => handleUpdateCat(c.id, editCat.name)}>Salvar</button><button className="btn btn-secondary btn-sm" onClick={() => setEditCat(null)}>Cancelar</button></>) : (<><button className="btn btn-secondary btn-sm" onClick={() => setEditCat({ id: c.id, name: c.name })}>Editar</button><button className="btn btn-danger btn-sm" onClick={() => handleDeleteCat(c.id)}>Excluir</button></>)}
              </div>
            </div>
          ))}</div>
          <div className="crud-add-row"><input className="form-input" placeholder="Nome da nova categoria..." value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateCat()} style={{ flex: 1 }} /><button className="btn btn-primary" onClick={handleCreateCat}>+ Adicionar</button></div>
        </div>
      )}

      {/* PLATFORMS */}
      {tab === "platforms" && (
        <div>
          <div className="crud-list">{platforms.map((p, idx) => (
            <div key={p.id} className="crud-item">
              <div style={{ flex: 1 }}>
                {editPlat?.id === p.id ? <input className="form-input" style={{ padding: "6px 10px", fontSize: 13 }} value={editPlat.name} onChange={e => setEditPlat({ ...editPlat, name: e.target.value })} /> : <span className="crud-item-name">{p.name}</span>}
                <div className="crud-item-id">ID: P{idx+1}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {editPlat?.id === p.id ? (<><button className="btn btn-primary btn-sm" onClick={() => handleUpdatePlat(p.id, editPlat.name)}>Salvar</button><button className="btn btn-secondary btn-sm" onClick={() => setEditPlat(null)}>Cancelar</button></>) : (<><button className="btn btn-secondary btn-sm" onClick={() => setEditPlat({ id: p.id, name: p.name })}>Editar</button><button className="btn btn-danger btn-sm" onClick={() => handleDeletePlat(p.id)}>Excluir</button></>)}
              </div>
            </div>
          ))}</div>
          <div className="crud-add-row"><input className="form-input" placeholder="Nome da nova plataforma..." value={newPlat} onChange={e => setNewPlat(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreatePlat()} style={{ flex: 1 }} /><button className="btn btn-primary" onClick={handleCreatePlat}>+ Adicionar</button></div>
        </div>
      )}

      {/* GENRES */}
      {tab === "genres" && (
        <div>
          <div className="crud-list">{genres.map((g, idx) => (
            <div key={g.id} className="crud-item">
              <div style={{ flex: 1 }}>
                {editGenre?.id === g.id ? <input className="form-input" style={{ padding: "6px 10px", fontSize: 13 }} value={editGenre.name} onChange={e => setEditGenre({ ...editGenre, name: e.target.value })} /> : <span className="crud-item-name">{g.name}</span>}
                <div className="crud-item-id">ID: G{idx+1}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {editGenre?.id === g.id ? (<><button className="btn btn-primary-film btn-sm" onClick={() => handleUpdateGenre(g.id, editGenre.name)}>Salvar</button><button className="btn btn-secondary btn-sm" onClick={() => setEditGenre(null)}>Cancelar</button></>) : (<><button className="btn btn-secondary btn-sm" onClick={() => setEditGenre({ id: g.id, name: g.name })}>Editar</button><button className="btn btn-danger btn-sm" onClick={() => handleDeleteGenre(g.id)}>Excluir</button></>)}
              </div>
            </div>
          ))}</div>
          <div className="crud-add-row"><input className="form-input" placeholder="Nome do novo gênero..." value={newGenre} onChange={e => setNewGenre(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateGenre()} style={{ flex: 1 }} /><button className="btn btn-primary-film" onClick={handleCreateGenre}>+ Adicionar</button></div>
        </div>
      )}

      {showGameForm && <GameFormModal game={editGame} categories={categories} platforms={platforms} onClose={() => { setShowGameForm(false); setEditGame(null); }} onSave={editGame ? handleUpdateGame : handleCreateGame} toast={toast} />}
      {showMovieForm && <MovieFormModal movie={editMovie} genres={genres} onClose={() => { setShowMovieForm(false); setEditMovie(null); }} onSave={editMovie ? handleUpdateMovie : handleCreateMovie} toast={toast} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────

export default function App() {
  const [currentUser, setCurrentUser]   = useState(null);
  const [userProfile, setUserProfile]   = useState(null);
  const [authLoading, setAuthLoading]   = useState(true);

  const [games, setGames]               = useState([]);
  const [movies, setMovies]             = useState([]);
  const [allReviews, setAllReviews]     = useState([]);
  const [allMovieReviews, setAllMovieReviews] = useState([]);
  const [categories, setCategories]     = useState([]);
  const [platforms, setPlatforms]       = useState([]);
  const [genres, setGenres]             = useState([]);
  const [dataLoading, setDataLoading]   = useState(true);

  const [view, setView]                 = useState("home");
  const [section, setSection]           = useState("games"); // "games" | "movies"
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);

  const [search, setSearch]             = useState("");
  const [filterCat, setFilterCat]       = useState("");
  const [filterPlat, setFilterPlat]     = useState("");
  const [filterGenre, setFilterGenre]   = useState("");

  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [showAuth, setShowAuth]         = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);

  const toast = useToast();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) { const profile = await getUserProfile(user.uid); setUserProfile(profile); }
      else { setUserProfile(null); }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setDataLoading(true);
    try {
      const safe = (fn) => fn().catch(() => []);
      const [g, mv, r, mr, c, p, gn] = await Promise.all([
        safe(getGames), safe(getMovies),
        safe(getAllReviews), safe(getAllMovieReviews),
        safe(getCategories), safe(getPlatforms), safe(getGenres),
      ]);
      setGames(g); setMovies(mv); setAllReviews(r); setAllMovieReviews(mr);
      setCategories(c); setPlatforms(p); setGenres(gn);
    } catch (e) {
      console.error("loadData error:", e);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleLogout() { await logoutUser(); setView("home"); toast.show("Até logo!"); }

  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin";

  // Reset search when switching sections
  function handleSectionChange(s) {
    setSection(s);
    setSearch(""); setFilterCat(""); setFilterPlat(""); setFilterGenre("");
  }

  const filteredGames = games.filter(g => {
    const s = search.toLowerCase();
    return (!s || g.title?.toLowerCase().includes(s)) && (!filterCat || g.category === filterCat) && (!filterPlat || g.platforms?.includes(filterPlat));
  });

  const filteredMovies = movies.filter(m => {
    const s = search.toLowerCase();
    return (!s || m.title?.toLowerCase().includes(s)) && (!filterGenre || m.genre === filterGenre);
  });

  if (authLoading) return (<><style>{css}</style><div className="loading" style={{ height: "100vh" }}><div className="spinner" /> Autenticando...</div></>);

  return (
    <>
      <style>{css}</style>
      <Toast toast={toast.toast} />

      <HamburgerDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} currentUser={currentUser} userProfile={userProfile} onLogout={handleLogout} onChangePw={() => setShowChangePw(true)} onAdmin={() => setView("admin")} />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} toast={toast} />}
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} toast={toast} userProfile={userProfile} />}

      <header className="header">
        <div className="header-left">
          <button className="hamburger" onClick={() => setDrawerOpen(true)} aria-label="Menu"><span /><span /><span /></button>
        </div>
        <div className="logo" onClick={() => setView("home")}>
          <img src="data:image/png;base64,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" alt="GameVault" style={{ height: "36px", width: "auto", display: "block" }} />
        </div>
        <div className="header-right">
          {currentUser ? (
            <div className="user-pill"><UserAvatar user={currentUser} size={28} /><span className="user-name">{userProfile?.username || userProfile?.name || currentUser.displayName}</span></div>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowAuth(true)}>Entrar</button>
          )}
        </div>
      </header>

      <main className="main">
        {view === "admin" && isAdmin ? (
          <AdminPanel
            currentUser={currentUser} userProfile={userProfile}
            games={games} movies={movies} allReviews={allReviews} allMovieReviews={allMovieReviews}
            categories={categories} platforms={platforms} genres={genres}
            toast={toast} onDataChange={loadData}
            onViewGame={(game) => { setSelectedGame(game); setView("detail"); }}
            onViewMovie={(movie) => { setSelectedMovie(movie); setView("movie-detail"); }}
          />
        ) : view === "detail" && selectedGame ? (
          <GameDetailPage game={selectedGame} currentUser={currentUser} userProfile={userProfile} onBack={() => setView("home")} onDataChange={loadData} toast={toast} />
        ) : view === "movie-detail" && selectedMovie ? (
          <MovieDetailPage movie={selectedMovie} currentUser={currentUser} userProfile={userProfile} onBack={() => { setView("home"); setSection("movies"); }} onDataChange={loadData} toast={toast} />
        ) : (
          <>
            {!currentUser && (
              <div className="hero">
                <div className="hero-title">Descubra e avalie<br />games e filmes</div>
                <div className="hero-sub">A biblioteca com avaliações reais da comunidade.</div>
                <div className="hero-cta">
                  <button className="btn-google" onClick={() => setShowAuth(true)}>
                    <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Entrar com Google
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowAuth(true)}>Criar conta</button>
                </div>
              </div>
            )}

            {/* SECTION TABS */}
            <div className="section-tabs">
              <button className={`section-tab ${section === "games" ? "active-games" : ""}`} onClick={() => handleSectionChange("games")}>Games</button>
              <button className={`section-tab ${section === "movies" ? "active-movies" : ""}`} onClick={() => handleSectionChange("movies")}>Filmes</button>
            </div>

            {/* GAMES SECTION */}
            {section === "games" && (
              <>
                <div className="filters">
                  <input className="search-input" placeholder="Buscar jogo..." value={search} onChange={e => setSearch(e.target.value)} />
                  <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}><option value="">Todas as categorias</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                  <select className="filter-select" value={filterPlat} onChange={e => setFilterPlat(e.target.value)}><option value="">Todas as plataformas</option>{platforms.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select>
                </div>
                {dataLoading ? <Spinner /> : filteredGames.length === 0 ? (
                  <div className="empty"><div className="empty-icon">🎮</div><div className="empty-text">{games.length === 0 ? "Nenhum jogo cadastrado ainda." : "Nenhum jogo encontrado."}</div></div>
                ) : (
                  <div className="content-grid">
                    {filteredGames.map(game => {
                      const gr = allReviews.filter(r => r.gameId === game.id);
                      const score = avg(gr);
                      return (
                        <div key={game.id} className="content-card" onClick={() => { setSelectedGame(game); setView("detail"); }}>
                          {!game.reviewsEnabled && <span className="flag-disabled">Reviews off</span>}
                          <div className="card-img">{game.image ? <img src={game.image} alt={game.title} /> : "🎮"}</div>
                          <div className="card-body">
                            
                            {game.category && <span className="category-tag">{game.category}</span>}
                            <div className="card-title">{game.title}</div>
                            <div className="card-meta">{game.developer}{game.releaseYear ? ` · ${game.releaseYear}` : ""}</div>
                            <div className="card-footer">
                              <div className="card-score-block">
                                <ScoreBadge score={score} />
                                <div className="card-review-count">{gr.length} {gr.length === 1 ? "avaliação" : "avaliações"}</div>
                              </div>
                              <div className="card-platforms">{game.platforms?.join(", ")}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* MOVIES SECTION */}
            {section === "movies" && (
              <>
                <div className="filters">
                  <input className="search-input" placeholder="Buscar filme..." value={search} onChange={e => setSearch(e.target.value)} />
                  <select className="filter-select" value={filterGenre} onChange={e => setFilterGenre(e.target.value)}><option value="">Todos os gêneros</option>{genres.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}</select>
                </div>
                {dataLoading ? <Spinner /> : filteredMovies.length === 0 ? (
                  <div className="empty"><div className="empty-icon">🎬</div><div className="empty-text">{movies.length === 0 ? "Nenhum filme cadastrado ainda." : "Nenhum filme encontrado."}</div></div>
                ) : (
                  <div className="content-grid">
                    {filteredMovies.map(movie => {
                      const mr = allMovieReviews.filter(r => r.movieId === movie.id);
                      const score = avg(mr);
                      return (
                        <div key={movie.id} className="content-card film-card" onClick={() => { setSelectedMovie(movie); setView("movie-detail"); }}>
                          <div className="card-img">{movie.image ? <img src={movie.image} alt={movie.title} /> : "🎬"}</div>
                          <div className="card-body">
                            
                            {movie.genre && <span className="genre-tag">{movie.genre}</span>}
                            <div className="card-title">{movie.title}</div>
                            <div className="card-meta">{movie.director ? `Dir. ${movie.director}` : ""}{movie.releaseYear ? ` · ${movie.releaseYear}` : ""}</div>
                            <div className="card-footer">
                              <div className="card-score-block">
                                <ScoreBadge score={score} />
                                <div className="card-review-count">{mr.length} {mr.length === 1 ? "avaliação" : "avaliações"}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
