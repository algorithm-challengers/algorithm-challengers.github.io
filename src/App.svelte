<script>
	import './data/users_inject';
	import { users } from './data/users_list';
	import { problems } from './problems';
	import Chart from './Chart.svelte';

	let tap = 0;

	function setTap(t) {
		switch (t) {
			case 0:
				break;
			case 1:
				users.sort((a, b) => b.score - a.score);
				break;
			case 2:
				break;
			case 3:
				break;
			default:
				break;
		}
		return function () {
			tap = t;
		};
	}
</script>

<main>
	<h1>Algorithm Challengers</h1>
	<button type="button" on:click={setTap(0)}>소개</button>
	<button type="button" on:click={setTap(1)}>랭킹</button>
	<button type="button" on:click={setTap(2)}>문제</button>
	<button type="button" on:click={setTap(3)}>카카오톡 오픈 채팅방</button>
	<hr />

	{#if tap == 0}
		<h3>2022 코딩 테스트 콘테스트</h3>
		<p>1. 일주일에 3~5개 정도의 코딩테스트 문제가 업로드 됩니다.</p>
		<p>2. 난이도 별로 다양한 코딩테스트가 선정 됩니다.</p>
		<p>3. 문제를 풀 때마다 성실 점수가 1점씩 올라가게 됩니다.</p>
		<p>4. 몇일 지난 문제도 풀어도 점수가 인정되요!</p>
		<p>5. 문제 목록은 이 사이트의 문제탭에서 확인할 수 있습니다.</p>
		<p>6. 각종 개선사항 및 문의는 프로젝트의 이슈에 남겨주시면 감사하겠습니다.</p>
        <p>7. 요청은 냥냥이 || 날코냥이 || 눈냥이 한테 문의하면 됩니다.</p>
		<p>9. 점수 반영 요청은 <a href="https://docs.google.com/forms/d/e/1FAIpQLSfWbriP5yBfhPHMNNg44hhWUxEq-vSLYTZBES_guPUx3l9K7A/viewform?usp=sf_link">이 링크</a>를 클릭하여 문제를 푼 스크린샷을 첨부하면 일정 기간 후 일괄적으로 처리하여 반영하겠습니다.</p>
	{/if}

	{#if tap == 1}
		<Chart></Chart>
		{#each users as user, i}
			<h3>{i+1} : {user.name} (<a target="_black" href="https://github.com/{user.contact}">@{user.contact}</a>)</h3>
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
				{#each user.solveds as solved}
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
					<p>easy: <a target="_black" href={problem.easy}>{problem.easy}</a></p>
				{/if}
				{#if problem.medium != ''}
					<p>medium: <a target="_black" href={problem.medium}>{problem.medium}</a></p>
				{/if}
				{#if problem.hard != ''}
					<p>hard: <a target="_black" href={problem.hard}>{problem.hard}</a></p>
				{/if}
			</details>
		{/each}
	{/if}

	{#if tap == 3}
		<p>라룩냥이는 돼뚱냥이</p>
		<a target="_black" href="https://open.kakao.com/o/gbCkR4zd">카카오톡 오픈톡 링크</a>
	{/if}
</main>
