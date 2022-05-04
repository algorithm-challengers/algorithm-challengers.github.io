<script>
    import { onMount } from "svelte";
    import { LineChart } from "@toast-ui/chart";
    import { users } from "./data/users_list";
    import { problems } from "./problems";

    let category = problems.map((problem) => problem.date).reverse();
    let series = [];

    for (let user of users) {
        let username = user.name;

        let data = [];

        let categoryPoint = 0;
        let solvedPoint = 0;
        let point = 0;

        for (; categoryPoint < category.length; categoryPoint++) {
            while (
                solvedPoint < user.solveds.length &&
                category[categoryPoint] ==
                    user.solveds[solvedPoint].split(":")[0]
            ) {
                switch (user.solveds[solvedPoint].split(":")[1]) {
                    case "easy":
                        point = point + 10;
                        break;
                    case "medium":
                        point = point + 20;
                        break;
                    case "hard":
                        point = point + 30;
                        break;
                }
                solvedPoint++;
            }
            data.push(point);
        }
        series.push({
            name: username,
            data: data,
        });
    }

    onMount(() => {
        let chart = new LineChart({
            el: document.querySelector("#chartCanvas"),
            data: {
                categories: category,
                series: series,
            },
            options: {
                chart: {
                    width: 684,
                    height: 456,
                    //   height: 300,
                    // title: "똑냥이 랭킹",
                },
                xAxis: {
                    title: "날짜",
                    date: { format: "yy/MM/dd" },
                },
                yAxis: {
                    title: "점수(score)",
                },
                series: {
                    selectable: true,
                },
                legend: {
                    align: "bottom",
                },
                tooltip: {
                    // css 문제로 tooltip 제거 전역 CSS 재작성 해야함.
                    template: () => {
                        return `<div style="width: 0px;></div>`;
                    },
                },
            },
        });
    });
</script>

<div id="chartCanvas" />

