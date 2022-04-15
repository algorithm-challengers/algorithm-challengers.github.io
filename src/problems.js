
export class Problem {
    constructor(date, easy, medium, hard) {
        this.date = date;
        this.easy = easy;
        this.medium = medium;
        this.hard = hard;
    }
}

export const problems = [
    new Problem('2022-04-14', 'https://programmers.co.kr/learn/courses/30/lessons/42840', '', ''),
    new Problem('2022-04-15', 'https://programmers.co.kr/learn/courses/30/lessons/42748', '', ''),
]