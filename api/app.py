"""
React 연동 Flask API 서버 (Vercel 배포 가능)
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import json
import secrets
from datetime import datetime

# 현재 디렉토리를 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# crawler.py import
try:
    from crawler import ArcaLiveCrawler
except ImportError:
    print("❌ crawler.py 파일이 필요합니다.")
    sys.exit(1)

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

# CORS 설정 - 모든 출처 허용 (Vercel 배포 시)
CORS(app)

# 전역 변수로 댓글 데이터 관리 (메모리 기반 - 간단한 용도)
comments_data = {}


@app.route('/')
def index():
    """API 정보"""
    return jsonify({
        'name': '쁘거 주작기 API',
        'version': '1.0.0',
        'endpoints': {
            '/api/crawl': 'POST - 댓글 크롤링',
            '/api/health': 'GET - 서버 상태 확인'
        }
    })


@app.route('/api/health')
def health():
    """서버 상태 확인"""
    return jsonify({
        'status': 'ok',
        'message': 'Server is running'
    })


@app.route('/api/crawl', methods=['POST', 'OPTIONS'])
def crawl_comments():
    """댓글 크롤링 API"""
    # OPTIONS 요청 처리 (CORS preflight)
    if request.method == 'OPTIONS':
        return '', 204
    
    global comments_data
    
    try:
        data = request.get_json()
        url = data.get('url', '').strip()
        
        # URL 검증
        if not url:
            return jsonify({
                'success': False,
                'error': 'URL을 입력해주세요.'
            }), 400
        
        if 'arca.live' not in url:
            return jsonify({
                'success': False,
                'error': '아카라이브 URL이 아닙니다.'
            }), 400
        
        print(f"📡 크롤링 시작: {url}")
        
        # 크롤러 실행
        crawler = ArcaLiveCrawler()
        comments = crawler.get_comments(url)
        
        if not comments:
            return jsonify({
                'success': False,
                'error': '댓글을 찾을 수 없습니다. URL을 확인해주세요.'
            }), 404
        
        # 세션 ID 생성 및 데이터 저장
        session_id = secrets.token_hex(8)
        comments_data[session_id] = {
            'comments': comments,
            'url': url,
            'timestamp': datetime.now().isoformat()
        }
        
        # 고유 작성자 추출
        unique_authors = list(dict.fromkeys([c['author'] for c in comments]))
        
        print(f"✅ 크롤링 완료: {len(comments)}개 댓글, {len(unique_authors)}명 작성자")
        
        # React에서 기대하는 형식으로 응답
        return jsonify({
            'success': True,
            'session_id': session_id,
            'data': comments,
            'stats': {
                'totalComments': len(comments),
                'uniqueAuthors': len(unique_authors)
            }
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': f'크롤링 중 오류가 발생했습니다: {str(e)}'
        }), 500


# Vercel 서버리스 함수용 핸들러
def handler(event, context):
    """Vercel 서버리스 함수 진입점"""
    return app(event, context)


if __name__ == '__main__':
    print("=" * 60)
    print("🍔 쁘거 주작기 백엔드 API 서버")
    print("=" * 60)
    print("📍 서버 주소: http://localhost:5000")
    print("📍 Health Check: http://localhost:5000/api/health")
    print("📍 크롤링 API: POST http://localhost:5000/api/crawl")
    print("=" * 60)
    print("\n⚠️  React 앱 실행 방법:")
    print("   cd .. && npm start")
    print("=" * 60)
    print("\n서버 시작 중...\n")
    
    # 개발 서버 실행
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
