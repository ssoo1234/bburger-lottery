"""
arca.live 댓글 크롤러
"""
import requests
from bs4 import BeautifulSoup
import time
from typing import List, Dict
import re

class ArcaLiveCrawler:
    # HTTP 요청 시 사용할 헤더 (최신 Chrome User-Agent 사용)
    HEADERS = {
        # 최신 Chrome User-Agent (2025년 기준)
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        # 요청이 아카라이브 내부에서 온 것처럼 보이게 하는 Referer 유지
        'Referer': 'https://arca.live/',
    }

    def __init__(self):
        """
        크롤러 초기화 및 requests 세션 생성.
        """
        print("Crawler initialized (using requests/BeautifulSoup Session).")
        self.post_author = ""
        # requests.Session을 사용하여 연결을 유지하고 쿠키를 관리합니다.
        self.session = requests.Session() 

    def _extract_post_author(self, soup: BeautifulSoup) -> str:
        """게시글 작성자를 추출합니다."""
        member_info = soup.select_one('.member-info .user-info a')
        post_author = ""
        if member_info:
            post_author = member_info.get('data-filter', '').strip()
            if not post_author:
                post_author = member_info.get_text(strip=True)
        return post_author

    def get_comments(self, url: str) -> List[Dict[str, str]]:
        """
        지정된 URL에서 댓글 데이터를 추출하는 핵심 메서드.
        
        403 오류를 우회하기 위해 게시글 URL 요청 전, 메인 도메인에 요청하여
        필수 쿠키(예: 보안 쿠키)를 세션에 미리 확보합니다.
        """
        
        # 0. 필수 쿠키 확보 단계 (403 우회 시도)
        try:
            base_url_match = re.match(r'(https?://[^/]+)', url)
            if base_url_match:
                base_url = base_url_match.group(0)
                # 메인 페이지에 먼저 접근하여 필요한 쿠키를 세션에 저장
                print(f"✨ 초기 쿠키 확보를 위해 메인 페이지 ({base_url})에 접근합니다.")
                self.session.get(base_url, headers=self.HEADERS, timeout=5)
                time.sleep(0.5) # 짧은 대기
        except Exception as e:
            print(f"⚠️ 초기 쿠키 확보 요청 중 오류 발생: {e}")
            # 오류가 발생해도 크롤링은 계속 시도

        # 1. HTML 소스 코드 가져오기 (세션 사용)
        try:
            # 크롤링 매너를 위해 요청 전에 잠시 대기
            time.sleep(1.5) # 시간을 1.5초로 더 늘려 봇 감지 회피 시도
            
            # session 객체를 사용하여 요청, 타임아웃 10초 적용
            response = self.session.get(url, headers=self.HEADERS, timeout=10)
            response.raise_for_status() # HTTP 오류가 발생하면 예외 발생
        except requests.exceptions.HTTPError as e:
            # 403 에러 발생 시 로그 출력
            print(f"❌ HTTP 요청 오류 발생: {e}")
            return []
        except requests.exceptions.RequestException as e:
            print(f"❌ 요청 오류 발생: {e}")
            return []

        # 2. BeautifulSoup으로 HTML 파싱
        soup = BeautifulSoup(response.text, 'html.parser')
        comments_data = []
        
        # 게시글 작성자 추출
        self.post_author = self._extract_post_author(soup)
        if self.post_author:
            print(f"게시글 작성자: {self.post_author}")
            
        # 3. 댓글 요소 찾기 및 데이터 추출
        comment_elements = soup.select('.comment-item')

        if not comment_elements:
            # 콘텐츠가 없는 경우, 서버가 비정상적인 응답을 보냈을 가능성도 확인
            if response.status_code == 200 and '댓글' not in response.text:
                 print("⚠️ HTML 내용에 댓글 영역이 포함되어 있지 않습니다. 차단/보안 문제일 수 있습니다.")
            print("⚠️ 댓글 영역을 찾을 수 없거나 댓글이 없습니다.")
            return []

        print(f"🔎 총 {len(comment_elements)}개의 댓글 요소를 찾았습니다.")

        for comment in comment_elements:
            try:
                # 닉네임 추출
                user_info = comment.select_one('.user-info a')
                author = ""
                if not user_info:
                    # 익명 또는 탈퇴자
                    author_span = comment.select_one('.user-info span.name')
                    author = author_span.get_text(strip=True) if author_span else "익명/정보 없음"
                else:
                    # data-filter 또는 텍스트 내용 사용
                    author = user_info.get('data-filter', '').strip() or user_info.get_text(strip=True)
                
                # 게시글 작성자 제외
                if self.post_author and author == self.post_author:
                    continue

                # 댓글 내용 추출
                message_elem = comment.select_one('.message')
                content = message_elem.get_text(strip=True) if message_elem else ""
                
                # 이모티콘만 있는 경우 처리
                if not content and comment.select_one('.emoticon-wrapper'):
                    content = "[이모티콘]"

                # 작성 시간 추출
                time_elem = comment.select_one('time')
                comment_time = time_elem.get_text(strip=True) if time_elem else "시간 정보 없음"

                if author and author not in ["익명/정보 없음", "작성자"]:
                    comments_data.append({
                        'author': author,
                        'content': content if content else "[내용 없음]",
                        'time': comment_time
                    })
                    
            except Exception as e:
                # 특정 댓글 파싱 중 오류 발생 시 건너뛰고 계속 진행
                print(f"⚠️ 특정 댓글 파싱 중 오류: {e}")
                continue
                
        return comments_data
