import { solveds } from "./solved";

export class User {
    constructor(name, contact) {
        this.name = name;
        this.contact = contact;
        this.easy = 0;
        this.medium = 0;
        this.hard = 0;
        this.score = 0;
    }
}

export let users = [
    new User('냥냥이', '냥냥이@삐약삐약.com'),
    new User('snowmerak', '@snowmerak'),
    new User('lemon-mint', '@lemon-mint'),
]

users.sort((a, b) => b.score - a.score);

for (let i = 0; i < users.length; i++) {
    let user = users[i];
    let solved = solveds[user.name];
    if (solved) {
        for (let j = 0; j < solved.length; j++) {
            let [date, level] = solved[j].split(':');
            if (level === 'easy') {
                user.easy++;
            } else if (level === 'medium') {
                user.medium++;
            } else if (level === 'hard') {
                user.hard++;
            }
        }
        user.score = user.easy + user.medium + user.hard;
    }
}