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
	<button on:click={setTap(0)}>랭킹</button>
	<button on:click={setTap(1)}>문제</button>
	<button on:click={setTap(2)}>냥방</button>
	<hr />

	{#if tap == 0}
		<h2>똑냥이</h2>
		{#each users as user, i}
			<h3>{i+1} : {user.name} ({user.contact})</h3>
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

	{#if tap == 1}
		<h2>problems</h2>
		{#each problems as problem}
			<h3>{problem.date}</h3>
			<details>
				<summary>list</summary>
				{#if problem.easy != ''}
				<p>easy: {problem.easy}</p>
				{/if}
				{#if problem.medium != ''}
					<p>medium: {problem.medium}</p>
				{/if}
				{#if problem.hard != ''}
					<p>hard: {problem.hard}</p>
				{/if}
			</details>
		{/each}
	{/if}

	{#if tap == 2}
		<h2>냥방</h2>
		<p>[대충 냥냥이가 쓸 소개말]</p>
		<a href="https://open.kakao.com/o/gbCkR4zd">카카오톡 오픈톡 링크</a>
	{/if}
</main>
