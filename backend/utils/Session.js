class Session {
  constructor(userId, type) {
    this.userId = userId;
    this.type = type;
  }

  getUserId() {
    return this.userId;
  }
  getType() {
    return this.type;
  }
}
export default Session;