export class Group{

    constructor(name = "", teacherId, students= [], wordles=[], initDate, endDate = null){
        this.groupId = crypto.randomUUID().replace(/-/g, ""); 
        this.name = name;
        this.teacherId = teacherId;
        this.students = students;
        this.wordles = wordles;
        this.initDate = initDate || new Date().toISOString().split("T")[0]; ;
        this.endDate = endDate;
    }


    updateGroup(Group){
        this.name = Group.name;
        this.students = Group.students;
        this.wordles = Group.wordles;
        this.initDate = Group.initDate;
        this.endDate = Group.endDate;
    }

    //Getters
    getId(){
        return this.groupId;
    }
    getName() {
        return this.name;
    }
    getTeacherId() {
        return this.teacherId;
    }
    getStudents() {
        return this.students;
    }
    getWordles() {
        return this.wordles;
    }
    getInitDate() {
        return this.initDate;
    }
    getEndDate() {
        return this.endDate;
    }


    //Adders
    addStudent(student){
        this.students.push(student);
    }
    addWordle(wordle){
        this.wordles.push(wordle);
    }

    //Remove
    removeStudents(studentId) {
        console.log("Lista inicial alumnos: ", this.students);
        newStudents = this.students.filter(item => {
            return item.getId() != studentId;
        });

        this.students = newStudents;
        console.log("Lista final estudiantes: ", this.students);

    }
    
    removeWordle(wordleId) {
        console.log("Lista final wordles: ", this.wordles);
        newWordles = this.wordles.filter(item => {
            return item.getId() != wordleId;
        });

        this.wordles = newWordles;
        console.log("Lista final wordles: ", this.wordles);

    }
}
export default Group;