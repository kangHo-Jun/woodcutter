
# 2440x1220 원판에 1000x600 4개 배치 시뮬레이션
# 사용자 의견: 가로 1회, 세로 4회 = 총 5회

def simulate_optimized_cuts():
    print("--- 1000x600 x 4 pieces Optimized Cut Simulation ---")
    
    # 1. 원판 가로로 길게 한 번 자름 (1000mm 지점에서 세로로 자르는 대신, 600mm 지점에서 가로로 자름)
    # 실제로는 1000x1220 영역을 먼저 확보하는 것이 아니라, 
    # 2440x600 영역을 가로로 길게 한 번 잘라냄 (Cut 1: Horizontal)
    # 이 영역에 1000x600 짜리 2개가 들어감.
    
    # 하지만 사용자가 말한 "가로 1회, 세로 4회"는 다음과 같은 구조일 가능성이 높음:
    # 2440 x 1220 원판에서
    # (0,0) ~ (2000, 600) 영역을 사용한다고 치면:
    # 1. y=600 선을 따라 가로로 길게 컷 (Cut 1) -> 2440x600 짜리 긴 판재 생성
    # 2. 이 긴 판재를 x=1000, x=2000 에서 자름 (Cut 2, 3) -> 1000x600 2개 확보 (남은 440x600은 자투리)
    # 3. 남은 2440x620 영역에서 똑같이 반복하거나...
    
    # "가로 1회, 세로 4회" 시나리오 재구성:
    # 1. y=600 지점에서 가로 전체를 한 번에 컷 (1회) -> 상단 2440x600, 하단 2440x620
    # 2. 상단 2440x600에서 x=1000, x=2000 지점 컷 (2회) -> 1000x600 2개 완성
    # 3. 하단 2440x620에서 x=1000, x=2000 지점 컷 (2회) -> 1000x600 2개 완성
    # 총계: 1 + 2 + 2 = 5회!!
    
    print("Scenario: Parallel Placement (2x2 grid-like but shared long cut)")
    print("1. Long Horizontal Cut at y=600 (Shared across 4 pieces): +1 cut")
    print("2. Vertical Cuts for top two pieces at x=1000, x=2000: +2 cuts")
    print("3. Vertical Cuts for bottom two pieces at x=1000, x=2000: +2 cuts")
    print("Total Cuts: 5")
    
    # 현재 내 알고리즘(Guillotine)이 7회인 이유:
    # 1. 첫 번째 조각 배치: 가로 1, 세로 1 (2회)
    # 2. 두 번째 조각 배치: 1000x600 옆에 붙임. 이미 한쪽은 잘려있으므로 세로 1 (1회) -> 여기까지 3회
    # 3. 세 번째 조각 배치: 다시 새 영역에서 시작하므로 가로 1, 세로 1 (2회) -> 여기까지 5회
    # 4. 네 번째 조각 배치: 세 번째 옆에 붙임. 세로 1 (1회) -> 여기까지 6회
    # ...? 아까 7회였던 건 split 로직에서 자투리 공간 2개를 만들 때마다 체크했기 때문.
    
    print("\n--- Current Algorithm logic (Overcounting) ---")
    print("Current logic counts every 'split' of a rectangle as a cut.")
    print("When splitting a 2440x1220 into 1000x600:")
    print("1. Split into (1000, 1220) and (1440, 1220) -> +1 cut")
    print("2. Split (1000, 1220) into (1000, 600) and (1000, 620) -> +1 cut")
    print("Each part addition triggers these splits.")

simulate_optimized_cuts()
