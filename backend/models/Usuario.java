public abstract class Usuario {
   private String ID_U; 
    private String mail;
    private String password;

    public Usuario(String ID_U, String mail, String password) {
      
        this.ID_U = ID_U;
        this.mail = mail;
        this.password = password;
    }

    public String getID_U() {
        return ID_U;
    }

    // los usuarios no pueden cambiar su ID
    // public void setID_U(String ID_U) {
    //     this.ID_U = ID_U;
    // }

    public String getMail() {
        return mail;
    }

    // los usuarios no pueden cambiar su mail
    // public void setMail(String mail) {
    //     this.mail = mail;
    // }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    @Override
    public String toString() {
        return "Usuario{" + "ID_U=" + ID_U + ", e-mail=" + mail + ", contraseña=" + password + '}';
    }


}