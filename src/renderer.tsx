import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>HorrorConnect</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="/static/feed-styles-optimized.css?v=20" />
        <style dangerouslySetInnerHTML={{__html: `
          /* Critical inline styles to replace problematic static CSS */
          .fixed-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background-color: white;
            border-bottom: 2px solid #e0e0e0;
            z-index: 1000;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 15px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          @media (max-width: 480px) {
            .fixed-header {
              padding: 0 10px;
            }
          }
          
          .header-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: black;
          }
          
          .header-ghost {
            width: 28px;
            height: 28px;
            background-color: black;
            border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
            position: relative;
            flex-shrink: 0;
          }
          
          .header-ghost::before,
          .header-ghost::after {
            content: '';
            position: absolute;
            width: 5px;
            height: 5px;
            background-color: white;
            border-radius: 50%;
            top: 13px;
          }
          
          .header-ghost::before {
            left: 5px;
          }
          
          .header-ghost::after {
            right: 5px;
          }
          
          .header-title {
            font-size: 1.2rem;
            font-weight: 700;
            margin: 0;
            letter-spacing: 0.5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          @media (max-width: 480px) {
            .header-title {
              font-size: 1.1rem;
              letter-spacing: 0.3px;
            }
          }
          
          .header-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
            min-width: 0;
          }
          
          .header-profile-link {
            text-decoration: none;
            color: inherit;
            flex-shrink: 1;
            min-width: 0;
          }
          
          .header-user-info {
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
          }
          
          /* ヘッダーではサムネイル非表示 */
          .header-user-avatar {
            display: none;
          }
          
          .header-avatar-img {
            display: none;
          }
          
          .header-avatar-placeholder {
            display: none;
          }
          
          .header-username {
            font-size: 0.85rem;
            font-weight: 500;
            color: #333;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 120px;
          }
          
          .header-verified-badge {
            font-size: 0.7rem;
            background-color: #007bff;
            color: white;
            padding: 1px 4px;
            border-radius: 8px;
            white-space: nowrap;
            flex-shrink: 0;
          }
          
          @media (max-width: 480px) {
            .header-actions {
              gap: 6px;
            }
            
            .header-username {
              font-size: 0.8rem;
              max-width: 80px;
            }
            
            .header-verified-badge {
              font-size: 0.65rem;
              padding: 1px 3px;
            }
          }
          
          .header-logout {
            padding: 5px 10px;
            font-size: 0.8rem;
            font-weight: 400;
            background-color: white;
            color: #666;
            border: 1px solid #ddd;
            border-radius: 4px;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            flex-shrink: 0;
          }
          
          .header-logout:hover {
            background-color: #f8f8f8;
            color: #333;
            border-color: #ccc;
          }
          
          @media (max-width: 480px) {
            .header-logout {
              padding: 4px 8px;
              font-size: 0.75rem;
            }
          }
          
          .authenticated-body {
            padding-top: 55px;
          }
          
          .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: white;
            border-top: 1px solid #e0e0e0;
            display: flex;
            width: 100%;
            height: 60px;
            z-index: 999;
            box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
          }
          
          .nav-item {
            flex: 1 1 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            padding: 12px 4px;
            text-decoration: none;
            color: #555555;
            min-width: 0;
          }
          
          .nav-item:hover {
            background-color: #f8f8f8;
          }
          
          .nav-item.active {
            color: black;
          }
          
          .nav-icon {
            width: 28px;
            height: 28px;
            position: relative;
          }
          
          /* Feed Icon */
          .feed-icon {
            background-color: #555555;
            clip-path: polygon(50% 6%, 12% 32%, 12% 100%, 88% 100%, 88% 32%);
            border-radius: 0 0 3px 3px;
            width: 32px;
            height: 26px;
            top: -1px;
          }
          
          .feed-icon::before {
            content: '';
            position: absolute;
            top: 3px;
            right: 9px;
            width: 4px;
            height: 9px;
            background-color: #555555;
            border-radius: 1px;
          }
          
          .feed-icon::after {
            content: '';
            position: absolute;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            width: 7px;
            height: 7px;
            background-color: white;
            border-radius: 50%;
          }
          
          .nav-item.active .feed-icon,
          .nav-item.active .feed-icon::before {
            background-color: black;
          }
          
          /* Match Icon */
          .match-icon {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            font-weight: bold;
            color: currentColor;
          }
          
          .match-icon::before {
            content: '♡';
          }
          
          .nav-item.active .match-icon {
            color: black;
          }
          
          /* Event Icon */
          .event-icon {
            background-color: currentColor;
            border-radius: 3px;
            width: 24px;
            height: 24px;
            top: 2px;
          }
          
          .event-icon::before {
            content: '';
            position: absolute;
            top: -4px;
            left: 5px;
            width: 3px;
            height: 8px;
            background-color: currentColor;
            border-radius: 2px;
            box-shadow: 8px 0 0 currentColor;
          }
          
          .event-icon::after {
            content: '';
            position: absolute;
            top: 8px;
            left: 4px;
            right: 4px;
            height: 2px;
            background: repeating-linear-gradient(
              90deg,
              white 0px,
              white 2px,
              transparent 2px,
              transparent 4px
            );
            background-size: 4px 2px;
            box-shadow: 0 4px 0 white, 0 8px 0 white;
          }
          
          .nav-item.active .event-icon::before {
            background-color: black;
            box-shadow: 8px 0 0 black;
          }
          
          /* Board Icon */
          .board-icon {
            background-color: currentColor;
            border-radius: 2px;
            width: 24px;
            height: 24px;
            top: 2px;
          }
          
          .board-icon::before {
            content: '';
            position: absolute;
            top: -2px;
            left: 50%;
            transform: translateX(-50%);
            width: 8px;
            height: 6px;
            background-color: currentColor;
            border-radius: 2px 2px 0 0;
          }
          
          .board-icon::after {
            content: '';
            position: absolute;
            top: 8px;
            left: 4px;
            right: 4px;
            height: 2px;
            background: repeating-linear-gradient(
              90deg,
              white 0px,
              white 6px,
              transparent 6px,
              transparent 8px
            );
            box-shadow: 0 4px 0 white, 0 8px 0 white;
          }
          
          .nav-item.active .board-icon,
          .nav-item.active .board-icon::before {
            background-color: black;
          }
          
          /* DM Icon */
          .dm-icon {
            background-color: currentColor;
            border-radius: 12px;
            width: 24px;
            height: 24px;
            top: -1px;
          }
          
          .dm-icon::before {
            content: '';
            position: absolute;
            top: 8px;
            left: 4px;
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background-color: white;
            box-shadow: 6px 0 0 white, 12px 0 0 white;
          }
          
          .dm-icon::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 6px;
            width: 6px;
            height: 6px;
            background-color: currentColor;
            clip-path: polygon(0 0, 100% 0, 20% 100%);
          }
          
          .nav-item.active .dm-icon,
          .nav-item.active .dm-icon::after {
            background-color: black;
          }
          
          /* Bookmark Tab Icon */
          .bookmark-tab-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: currentColor;
          }
          
          .bookmark-tab-icon::before {
            content: '★';
          }
          
          .nav-item.active .bookmark-tab-icon {
            color: black;
          }
          
          .tab-header {
            margin-bottom: 2px !important;
            padding-bottom: 2px !important;
          }
          
          .tab-title {
            font-size: 0.95rem !important;
            font-weight: 400 !important;
            color: black;
            margin: 0 !important;
          }
          
          .feed-post {
            border-bottom: 1px solid #ddd !important;
            margin-bottom: 2px !important;
            padding: 12px !important;
            background: white !important;
          }
          
          .feed-post:last-child {
            border-bottom: none !important;
            margin-bottom: 0 !important;
          }
          
          .main-container {
            height: calc(100vh - 65px);
            padding-bottom: 60px;
            padding-top: 2px;
          }
          
          .tab-content {
            height: 100%;
            overflow-y: auto;
          }
          
          .tab-panel {
            display: none;
            padding: 4px;
            height: 100%;
          }
          
          .tab-panel.active {
            display: block;
          }
          
          /* Consent checkbox styles */
          .consent-section {
            margin: 24px 0;
            padding: 16px;
            background-color: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
          }
          
          .consent-checkbox-group {
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }
          
          .consent-checkbox {
            width: 18px;
            height: 18px;
            margin-top: 2px;
            cursor: pointer;
            accent-color: #007bff;
            flex-shrink: 0;
          }
          
          .consent-label {
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            cursor: pointer;
            user-select: none;
            flex: 1;
          }
          
          .next-btn:disabled {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
            background-color: #6c757d !important;
          }
          
          /* 外部CSSの黒色設定を尊重 - 上書きしない */
          
          @media (max-width: 480px) {
            .consent-section {
              margin: 16px 0;
              padding: 12px;
            }
            
            .consent-label {
              font-size: 13px;
            }
          }
        `}} />
        <link rel="stylesheet" href="/static/style.min.css?v=5" />
      </head>
      <body>
        {children}
        {/* AppManagerを最初に読み込み、統合管理システムを初期化 */}
        <script src="/static/app-manager.js?v=6"></script>
        <script src="/static/feed-optimized.js?v=10"></script>
        <script src="/static/match.js?v=7"></script>
        <script src="/static/board.js?v=5"></script>
        <script src="/static/event.js?v=4"></script>
        <script src="/static/dm.js?v=5"></script>
        <script src="/static/bookmark.js?v=5"></script>
        <script src="/static/profile.js?v=4"></script>
      </body>
    </html>
  )
})