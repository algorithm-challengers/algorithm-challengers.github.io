<script>
	import { users } from './users';
	import { problems } from './problems';
</script>

<main>
	<h1>Algorithm Challengers</h1>
	<hr />
	<h3>entry</h3>
	{#each users as user, i}
		<h5>{i+1} : {user.name} ({user.contact})</h5>
		{#if user.easy > 0}
			<p>easy: {user.easy}</p>
		{/if}
		{#if user.medium}
			<p>medium: {user.medium}</p>
		{/if}
		{#if user.hard > 0}
			<p>hard: {user.hard}</p>
		{/if}
		<p><b>total score: {user.score}</b></p>
	{/each}
	<hr />
	<h3>problems</h3>
	{#each problems as problem}
		<h5>{problem.date}</h5>
		{#if problem.easy != ''}
			<p>easy: {problem.easy}</p>
		{/if}
		{#if problem.medium != ''}
			<p>medium: {problem.medium}</p>
		{/if}
		{#if problem.hard != ''}
			<p>hard: {problem.hard}</p>
		{/if}
	{/each}
</main>
