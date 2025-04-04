class Game{
    constructor(wordleId, studentId, points, date){
        this.wordleId = wordleId;
        this.studentId = studentId;
        this.points = points;
        this.date = date;
    }

    getWordleId(){
        return this.wordleId;
    }
    getStudentId(){
        return this.studentId;
    }
    getPoints(){
        return this.points;
    }
    getDate(){
        return this.date;
    }
    

}
export default Game;