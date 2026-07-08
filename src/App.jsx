import React, { useState } from 'react';
import './App.css';
import HelpDrawer from './components/HelpDrawer';

function App() {
  const [isDragActive, setIsDragActive] = useState(false);
 // 🌟 접속한 브라우저 언어를 감지하여 기본 언어 설정
  const [lang, setLang] = useState(() => {
    const browserLang = navigator.language || navigator.userLanguage || '';
    return browserLang.toLowerCase().includes('ko') ? 'KOR' : 'ENG';
  });
  const [daw, setDaw] = useState('ableton'); // 'ableton' or 'logic'
  const [results, setResults] = useState([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // 다국어 텍스트 사전 (통합)
  const text = {
    KOR: {
      title: "ShaperBox 3 프리셋 변환기",
      desc_ableton: "FL Studio의 .fst 프리셋을 Ableton Live의 .adg 포맷으로 변환합니다.",
      desc_logic: "FL Studio의 .fst 프리셋을 Logic Pro의 .aupreset 포맷으로 변환합니다.",
      warn: "⚠️ 주의: ShaperBox 3 하나만 단독으로 로드된 프리셋을 사용해 주세요.",
      upload: "파일을 선택하거나 여기에 드래그 앤 드롭하세요 (.fst)",
      result: "변환 결과",
      download: "다운로드",
      error: "파일에서 VST 데이터를 찾을 수 없습니다."
    },
    ENG: {
      title: "ShaperBox 3 Preset Converter",
      desc_ableton: "Convert FL Studio .fst presets to Ableton Live .adg format.",
      desc_logic: "Convert FL Studio .fst presets to Logic Pro .aupreset format.",
      warn: "⚠️ Note: Please ensure that the preset only has a single instance of ShaperBox 3 loaded.",
      upload: "Select files or drag & drop them here (.fst)",
      result: "Conversion Results",
      download: "Download",
      error: "Could not find VST data in the file."
    }
  }[lang];

  // 드래그 이벤트 핸들러
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragActive(true);
    else if (e.type === "dragleave") setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) handleFiles(e.target.files);
  };

  // 🔹 [핵심] 브라우저 내장 API를 이용한 GZIP 압축 함수 (Ableton 전용)
  const compressToGzipBlob = async (textData) => {
    const stream = new Blob([textData]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const response = new Response(compressedStream);
    return await response.blob();
  };

  // 🔹 통합 변환 로직
  const handleFiles = async (files) => {
    const fileList = Array.from(files).filter(file => file.name.endsWith('.fst'));
    const newResults = [];

    // 현재 선택된 DAW에 맞는 템플릿 불러오기
    const templatePath = daw === 'ableton' ? '/template.xml' : '/template.aupreset';
    let templateData = "";
    try {
      const response = await fetch(templatePath);
      templateData = await response.text();
    } catch (err) {
      alert(`템플릿 파일을 불러올 수 없습니다: ${templatePath}`);
      return;
    }

    for (let file of fileList) {
      const reader = new FileReader();
      
      await new Promise((resolve) => {
        reader.onload = async (e) => {
          const fstBytes = new Uint8Array(e.target.result);
          
          // 1. '#zip#' 시그니처 검색
          const signature = [35, 122, 105, 112, 35];
          let startIdx = -1;
          for (let i = 0; i < fstBytes.length - 5; i++) {
            if (signature.every((byte, index) => fstBytes[i + index] === byte)) {
              startIdx = i;
              break;
            }
          }

          if (startIdx === -1) {
            newResults.push({ name: file.name, success: false, msg: text.error });
            resolve();
            return;
          }

          const vstChunk = fstBytes.slice(startIdx);
          let downloadUrl = "";
          let outputName = "";

          // --- 🎹 Ableton Live (.adg) 변환 로직 ---
          if (daw === 'ableton') {
            // Hex 변환
            let hexString = "";
            for (let i = 0; i < vstChunk.length; i++) {
              let hex = vstChunk[i].toString(16).toUpperCase();
              if (hex.length === 1) hex = "0" + hex;
              hexString += hex;
            }
            // 300자씩 자르고 탭 추가
            const chunks = [];
            for (let i = 0; i < hexString.length; i += 300) {
              chunks.push(hexString.substring(i, i + 300));
            }
            const formattedHex = chunks.join('\n\t\t\t\t\t\t\t');
            
            const finalXml = templateData.replace('{HEX_DATA}', formattedHex);
            const gzipBlob = await compressToGzipBlob(finalXml);
            
            downloadUrl = URL.createObjectURL(gzipBlob);
            outputName = file.name.replace('.fst', '.adg');
          } 
          // --- 🍏 Logic Pro (.aupreset) 변환 로직 ---
          else {
            // Base64 변환
            let binaryString = "";
            for (let i = 0; i < vstChunk.length; i++) {
              binaryString += String.fromCharCode(vstChunk[i]);
            }
            const b64Str = btoa(binaryString);
            
            const regex = /(<key>jucePluginState<\/key>\s*<data>)(.*?)(<\/data>)/s;
            const finalXml = templateData.replace(regex, `$1\n${b64Str}\n$3`);
            
            const xmlBlob = new Blob([finalXml], { type: 'application/xml' });
            downloadUrl = URL.createObjectURL(xmlBlob);
            outputName = file.name.replace('.fst', '.aupreset');
          }

          newResults.push({ name: outputName, success: true, url: downloadUrl });
          resolve();
        };
        reader.readAsArrayBuffer(file);
      });
    }

    setResults(prev => [...prev, ...newResults]);
  };

 // ... (기존 변환 로직 코드는 그대로 유지) ...
return (
    <div className={`app-wrapper theme-${daw}`}>
      
      <div className="container">
        {/* 🌟 국기 영역을 container 안으로 이동했습니다! */}
        <div className="header-actions">
          <div className="lang-flags">
            <img 
              src="https://flagcdn.com/w40/kr.png" 
              alt="KOR"
              className={`flag ${lang === 'KOR' ? 'active' : ''}`} 
              onClick={() => setLang('KOR')}
              title="한국어"
            />
            <img 
              src="https://flagcdn.com/w40/us.png" 
              alt="ENG"
              className={`flag ${lang === 'ENG' ? 'active' : ''}`} 
              onClick={() => setLang('ENG')}
              title="English"
            />
          </div>
        </div>

        {/* 타이틀 */}
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
          {text.title}
        </h1>
        <p className="desc-text" style={{ marginBottom: '20px' }}>
          {daw === 'ableton' ? text.desc_ableton : text.desc_logic}
        </p>

        {/* A/B 모드 토글 스위치 */}
        <div className="toggle-container">
          <div 
            className={`toggle-btn ${daw === 'ableton' ? 'active' : ''}`}
            onClick={() => { setDaw('ableton'); setResults([]); }}
          >
            Ableton Live
          </div>
          <div 
            className={`toggle-btn ${daw === 'logic' ? 'active' : ''}`}
            onClick={() => { setDaw('logic'); setResults([]); }}
            style={{ position: 'relative' }}
          >
            Logic Pro
            <div 
              className="help-circle-btn" 
              onClick={(e) => { e.stopPropagation(); setIsHelpOpen(true); }}
              title="Help"
            >
              ?
            </div>
          </div>
        </div>

        <div className="warn-text" style={{ textAlign: 'center', marginBottom: '30px' }}>
          {text.warn}
        </div>

        {/* 드래그 앤 드롭 구역 */}
        <div 
          className={`dropzone ${isDragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input 
            id="file-input" 
            type="file" 
            multiple 
            accept=".fst" 
            style={{ display: 'none' }} 
            onChange={handleFileInput}
          />
          <p style={{ margin: 0, color: '#A0A0A0', fontSize: '15px' }}>{text.upload}</p>
        </div>

        {/* 결과창 */}
        {results.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>{text.result}</h3>
            {results.map((res, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{res.name}</span>
                {res.success ? (
                  <a href={res.url} download={res.name} className="btn" style={{ textDecoration: 'none', padding: '6px 14px', fontSize: '13px' }}>
                    {text.download}
                  </a>
                ) : (
                  <span style={{ color: '#FF4B4B', fontSize: '13px' }}>{res.msg}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 푸터 영역 */}
        <div className="footer">
          <div className="credit-text">@mamafosho</div>
        </div>
      </div>
      
      {/* 서랍 컴포넌트 */}
      <HelpDrawer isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} lang={lang} />
    </div>
  );
}

export default App;