import { useRef } from 'react';
import './Button.css';

export default function Button({ text, onClick, color1, color2, size = 'm' }) {
  const isWhite = /^(#ffffff|#fff|white)$/i.test(color1);
  const border = isWhite ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.08)';
  const rippleColor = isWhite ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 255, 255, 0.001)';
  const ref = useRef(null);

  const handleClick = (e) => {
    const btn = ref.current;
    const rect = btn.getBoundingClientRect();
    const d = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${d}px`;
    ripple.style.left = `${e.clientX - rect.left - d / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - d / 2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      className={`custom-button custom-button--${size}`}
      onClick={handleClick}
      style={{ '--bg': color1, '--fg': color2, '--border': border, '--ripple': rippleColor }}
    >
      {text}
    </button>
  );
}
