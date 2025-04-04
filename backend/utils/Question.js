export class Question{
    constructor(statement, options = [], correctAnswer = "", type = "simple")
     {
        this.questionId = crypto.randomUUID().replace(/-/g, ""); 
        this.statement = statement;
        this.options = options;
        this.correctAnswer = correctAnswer;
        this.type = type;
    }

    //Getters
    getId(){
        return this.questionId;
    }
    getStatement(){
        return this.statement;
    }
    getOptions(){
        return this.options;
    }
    getCorrectAnswer(){
        return this.correctAnswer;
    }
    getType(){
        return this.type;
    }


}

