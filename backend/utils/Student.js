class Student{
    constructor(mail){
        this.studentId = crypto.randomUUID().replace(/-/g, ""); 
        this.mail = mail;
        //generate password
        this.password = this.generateBasicPassword(mail);
    }

    generateBasicPassword(email) {
        const base = email.split("@")[0]; 
        const num = email.length % 100; 
        return base.slice(0, 3) + num + "!";
    }
    

    //Getters
    getId(){
        return this.groupId;
    }
    getMail() {
        return this.mail;
    }
    

    //Setter
    setPassword(password){
        this.password = password; 
    }

    

    
}
module.exports = Student;