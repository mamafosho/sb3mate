// src/components/HelpDrawer.jsx
import React from 'react';
import './HelpDrawer.css';

function HelpDrawer({ isOpen, onClose, lang }) {
  // 다국어 텍스트 사전 (도움말 전용)
  const text = {
    KOR: {
      title: "사용 방법",
      desc: "로직에서 쉐이퍼박스3키고 사진대로 로드하면되고 밑에 저장 눌러놓으면 AU presets에서 다음부터 바로 불러오기 가능"
    },
    ENG: {
      title: "How to use",
      desc: "You can also press save button and load it from AU Presets"
    }
  }[lang];

  return (
    <>
      {/* 1. 배경 오버레이 (클릭 시 서랍 닫힘) */}
      <div 
        className={`drawer-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
      ></div>

      {/* 2. 서랍 패널 본체 */}
      <div className={`help-drawer ${isOpen ? 'open' : ''}`}>
        {/* 닫기 버튼 */}
        <button className="close-btn" onClick={onClose}>×</button>
        
        {/* 타이틀 */}
        <h3 style={{ color: 'white', marginTop: 0, marginBottom: '20px' }}>
          {text.title}
        </h3>
        
        {/* public 폴더에 넣어둔 guide.png를 바로 불러옵니다 (Base64 변환 필요 없음!) */}
        <img 
          src="/guide.png" 
          alt="Guide" 
          style={{ width: '100%', borderRadius: '8px' }} 
        />
        
        {/* 설명 텍스트 */}
        <div style={{ color: '#A0A0A0', fontSize: '14px', marginTop: '15px', lineHeight: '1.6', wordBreak: 'keep-all' }}>
          {text.desc}
        </div>
      </div>
    </>
  );
}

export default HelpDrawer;