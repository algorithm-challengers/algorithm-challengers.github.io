<script>
	import { users } from './users';
	import { problems } from './problems';
	import { solveds } from './solved';
</script>

<main>
	<h1>Algorithm Challengers</h1>
	<hr />
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
	<hr />
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
</main>
