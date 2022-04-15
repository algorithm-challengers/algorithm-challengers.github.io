
export class User {
    constructor(name, contact, easy, medium, hard) {
        this.name = name;
        this.contact = contact;
        this.easy = easy;
        this.medium = medium;
        this.hard = hard;

        this.score = easy + 2*medium + 3*hard;
    }
}

export const users = [
    new User('냥냥이', '냥냥이@삐약삐약.com', 2, 0, 0),
    new User('snowmerak', '@snowmerak', 2, 0, 0),
    new User('lemon-mint', '', 1, 0, 0),
]

users.sort((a, b) => b.score - a.score);