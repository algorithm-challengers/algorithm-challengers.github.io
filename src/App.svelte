<script>
	import { users } from './users';
	import { problems } from './problems';
	import { solveds } from './solved';

	let tap = 0;

	function setTap(t) {
		return function () {
			tap = t;
		};
	}
</script>

<main>
	<h1>Algorithm Challengers</h1>
	<button type="button" on:click={setTap(0)}>소개</button>
	<button type="button" on:click={setTap(1)}>똑냥이 랭킹</button>
	<button type="button" on:click={setTap(2)}>문제</button>
	<button type="button" on:click={setTap(3)}>냥방</button>
	<hr />

	{#if tap == 0}
		<h3>2022 코딩 테스트 성실 냥이 콘테스트</h3>
		<p>1. 일주일에 3~5일 정도 가량 냥냥이가 엄선한 문제가 올라오는 거시애옹</p>
		<p>2. 청정수 문제 1개, 썩은물 문제 1개씩 내는 거시애옹</p>
		<p>3. 코딩테스트를 완료 하였다면 문제 웹 페이지의 전체를 캡처해서 냥방에 올리면 되는 거시야옹</p>
		<p>4. 문제를 풀 때마다 성실 냥이 점수가 1점씩 올르는 거시애옹</p>
		<p>5. 몇일 지난 문제도 풀어도 점수가 인정되는 거시애옹</p>
		<p>6. 문제 목록은 이 사이트에서 확인 할 수 있는 거시야옹!</p>
		<p>7. 각종 개선사항 및 문의는 눈냥이한테 물어봐달라냥</p>
        <p>8. 점수 갱신 및 수정 요청은 냥냥이 || 날코냥이 || 눈냥이 한테 문의하면 된다냥!</p>
	{/if}

	{#if tap == 1}
		{#each users as user, i}
			<h3>{i+1} : {user.name} (<a href="https://github.com/{user.contact}">@{user.contact}</a>)</h3>
			<details>
				<summary><b>total score: {user.score}</b></summary>
				{#if user.easy > 0}
					<p>easy: {user.easy}</p>
				{/if}
				{#if user.medium}
					<p>medium: {user.medium}</p>
				{/if}
				{#if user.hard > 0}
					<p>hard: {user.hard}</p>
				{/if}
			</details>
			<details>
				<summary>solved problems</summary>
				<ol>
				{#each solveds[user.name] as solved}
					<li>{solved}</li>
				{/each}
				</ol>
			</details>
		{/each}
	{/if}

	{#if tap == 2}
		{#each problems as problem}
			<h3>{problem.date}</h3>
			<details>
				<summary>list</summary>
				{#if problem.easy != ''}
					<p>easy: <a href={problem.easy}>{problem.easy}</a></p>
				{/if}
				{#if problem.medium != ''}
					<p>medium: <a href={problem.medium}>{problem.medium}</a></p>
				{/if}
				{#if problem.hard != ''}
					<p>hard: <a href={problem.hard}>{problem.hard}</a></p>
				{/if}
			</details>
		{/each}
	{/if}

	{#if tap == 3}
		<p>라룩냥이는 돼뚱냥이</p>
		<a href="https://open.kakao.com/o/gbCkR4zd">카카오톡 오픈톡 링크</a>
	{/if}
</main>
