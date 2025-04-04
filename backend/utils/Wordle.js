export class Wordle {
    constructor(name="", teacherId, words=[], questions=[], groups=[]) {
        this.wordleId = Math.floor(Math.random() * 1000);
        this.name = name;
        this.teacherId = teacherId;
        this.words = words;
        this.questions = questions;
        this.groups = groups;
    }


    updateWordle(Wordle) {
        this.name = Wordle.name;
        this.words = Wordle.words;
        this.questions = Wordle.questions;
        this.groups = Wordle.groups;
    }

    //Getters
    getId() {
        return this.wordleId;
    }
    getName() {
        return this.name;
    }
    getTeacherId() {
        return this.teacherId;
    }
    getWords() {
        return this.words;
    }
    getQuestions() {
        return this.questions;
    }
    getGroups() {
        return this.groups;
    }

    //Adders
    addWord(word) {
        this.words.push(word);
    }
    addQuestion(question) {
        this.questions.push(question);
    }
    addGroup(group) {
        this.groups.push(group);
    }

    //Remove
    removeWords(wordId) {
        console.log("Lista inicial palabras: ", this.words);
        newWords = this.words.filter(item => {
            return item.getId() != wordId;
        });

        this.words = newWords;
        console.log("Lista final palabras: ", this.words);

    }
    removeQuestions(questionId) {
        console.log("Lista final preguntas: ", this.questions);
        newQuestions = this.questions.filter(item => {
            return item.getId() != questionId;
        });

        this.questions = newQuestions;

        console.log("Lista final palabras: ", this.questions);
    }
    removeGroups(groupId) {
        console.log("Lista final preguntas: ", this.groups);
        newGroups = this.groups.filter(item => {
            return item.getId() != groupId;
        });

        this.groups = newGroups;
        console.log("Lista final preguntas: ", this.groups);

    }

}

