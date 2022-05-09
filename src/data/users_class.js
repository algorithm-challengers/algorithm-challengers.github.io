export class User {
    constructor(name, contact, solveds) {
        this.name = name;
        this.contact = contact;
        this.solveds = solveds;
        this.easy = 0;
        this.medium = 0;
        this.hard = 0;

        for (let i = 0; i < solveds.length; i++) {
            let [date, level] = solveds[i].split(':');
            if (level === 'easy') {
                this.easy++;
            } else if (level === 'medium') {
                this.medium++;
            } else if (level === 'hard') {
                this.hard++;
            }
        }

        this.score = this.easy * 10 + this.medium * 10 + this.hard * 10;
    }
}