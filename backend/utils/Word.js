export class Word {
    constructor(tittle, hint = "")
     {
        this.wordId = crypto.randomUUID().replace(/-/g, "");  
        this.tittle = tittle;
        this.hint = hint;
    }
    //Getters
    getId(){
        return this.wordId;
    }
    getTittle(){
        return this.tittle;
    }
    getHint(){
        return this.hint;
    }


}

