// backend/src/tests/authService.test.js


require('dotenv').config();

//TEST: Evito mockups y uso directamente el valor definido en env
const actual_JWT_SECRET = process.env.JWT_SECRET;
const actual_JWT_EXPIRATION_TIME = process.env.JWT_EXPIRATION_TIME;

const authService = require('../api/services/authService');

// Import dependencies that authService uses, which we will mock
const userService = require('../api/services/userService');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { isStrongPassword } = require('../utils/passwordUtils'); // Asegúrate de importar isStrongPassword


// Mock the entire userService module
jest.mock('../api/services/userService', () => ({
  findUserByEmail: jest.fn(),
  // Mock other userService functions if authService were to use them (it currently doesn't)
}));

// Mock the bcrypt module
jest.mock('bcrypt', () => ({
  compare: jest.fn(), // Mock the compare method used in login
  // Mock hash if authService were to use it (it currently doesn't)
  hash: jest.fn(),
}));

// Mock the jsonwebtoken module
jest.mock('jsonwebtoken', () => {
  const sign = jest.fn();
  return{
    sign: sign,
    verify: jest.fn(), 
    __esModule: true, 
    // sign,
  };
  });

jest.mock('../utils/passwordUtils', () => ({
  isStrongPassword: jest.fn(),
}));


// Describe block to group tests for the authService
describe('authService', () => {
  let HASHED_STRONG_PASSWORD;
  // Clean up mocks before each test to ensure isolation
  beforeAll(async () => {
    // Asegúrate de que esta contraseña sea "fuerte" según tu isStrongPassword
    HASHED_STRONG_PASSWORD = await bcrypt.hash('Password123!', 10);
  });
  
  beforeEach(() => {
    // Clear any previous mock calls, instances, and results
    jest.clearAllMocks();
    isStrongPassword.mockReturnValue(true);
      });

  // Test suite for the login function
  describe('login', () => {
    const email = 'test@example.com';
    const password = 'Password123!';
    const hashedPassword = HASHED_STRONG_PASSWORD;
    const mockToken = 'mock_jwt_token';

    // Mock a user object that userService.findUserByEmail would return
    // This object should simulate the structure expected by authService
    const createMockUser = (overrideProps = {}) => {
      const defaultUser = {
        id: 1,
        name: 'Test User',
        email,
        password: HASHED_STRONG_PASSWORD, // Importante: el mock debe tener 'password'
        role: 'student',
        
      };
      const user = { ...defaultUser, ...overrideProps };

      // Añade el método .get() al objeto mock
      return {
        ...user,
        get: jest.fn(function({ plain = false } = {}) {
          if (plain) {
            // Devuelve un objeto plano con las propiedades de datos
            return {
              id: this.id,
              name: this.name,
              email: this.email,
              password: this.password, // Asegúrate de incluirlo
              role: this.role,
              requiresPasswordChange: this.requiresPasswordChange || false,
            };
          }
          return this; // Si no es plain, devuelve el propio objeto mock
        }),
      };
    };

    // Test case: Successful login
    it('should return a token and user info on successful login', async () => {
      const mockUser = createMockUser();
      // Configure mocks for a successful scenario
      userService.findUserByEmail.mockResolvedValue(mockUser); // User found
      bcrypt.compare.mockResolvedValue(true); // Password matches
      jwt.sign.mockReturnValue(mockToken); // Token generated successfully

      // Call the service function
      const result = await authService.login(email, password);

      // --- DEBUGGING LOGS ---
      console.log('En el test - Resultado de authService.login:', result);
      console.log('En el test - mockUser:', mockUser);
      console.log('En el test - mockUser.dataValues:', mockUser ? mockUser.dataValues : null);
      
      console.log('En el test - JWT_SECRET:', process.env.JWT_SECRET);
      console.log('jwt.sign.mock.calls', jwt.sign.mock.calls);
      // --- END DEBUGGING LOGS ---


      // Assertions:
      // 1. Check if userService.findUserByEmail was called correctly
      expect(userService.findUserByEmail).toHaveBeenCalledTimes(1);
      expect(userService.findUserByEmail).toHaveBeenCalledWith(email);

      // 2. Check if bcrypt.compare was called correctly
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword); 

      // 3. Check if jwt.sign was called correctly
      expect(jwt.sign).toHaveBeenCalledTimes(1);
      const expectedPayload = {
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      expect(jwt.sign).toHaveBeenCalledWith(
        expectedPayload,
        actual_JWT_SECRET,
        { expiresIn: actual_JWT_EXPIRATION_TIME } 

      );

      // 4. Check the return value
      
      const expectedUser = { 
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
      };
      expect(result).toEqual({
        token: mockToken,
        user: expectedUser,
        requiresPasswordChange: false,
      });
    });

    // Test case: User not found
    it('should throw "User not found" error if user email does not exist', async () => {
      // Configure mocks for user not found scenario
      userService.findUserByEmail.mockResolvedValue(null); // User not found

      // Call the service function and expect an error
      await expect(authService.login(email, password)).rejects.toThrow('User not found');

      // Assertions:
      expect(userService.findUserByEmail).toHaveBeenCalledTimes(1);
      expect(userService.findUserByEmail).toHaveBeenCalledWith(email);
      // Check that bcrypt.compare and jwt.sign were NOT called
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    // Test case: Invalid password
    it('should throw "Invalid credentials" error if password does not match', async () => {
      const mockUser = createMockUser();
      // Configure mocks for invalid password scenario
      userService.findUserByEmail.mockResolvedValue(mockUser); // User found
      bcrypt.compare.mockResolvedValue(false); // Password does NOT match

      // Call the service function and expect an error
      await expect(authService.login(email, password)).rejects.toThrow('Invalid credentials');

      // Assertions:
      expect(userService.findUserByEmail).toHaveBeenCalledTimes(1);
      expect(userService.findUserByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      // Check that jwt.sign was NOT called
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    // Test case: Error during userService.findUserByEmail
    it('should throw an error if finding user fails', async () => {
      // Simulate an error from userService.findUserByEmail
      const findError = new Error('Database query failed');
      userService.findUserByEmail.mockRejectedValue(findError);

      // Call the service function and expect the error to be re-thrown
      await expect(authService.login(email, password)).rejects.toThrow('Database query failed');

      // Assertions:
      expect(userService.findUserByEmail).toHaveBeenCalledTimes(1);
      expect(userService.findUserByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    // Test case: Error during bcrypt.compare
    it('should throw an error if password comparison fails', async () => {
      const mockUser = createMockUser();
      // Configure mocks
      userService.findUserByEmail.mockResolvedValue(mockUser);
      const compareError = new Error('Bcrypt comparison error');
      bcrypt.compare.mockRejectedValue(compareError); // Simulate bcrypt error

      // Call the service function and expect the error to be re-thrown
      await expect(authService.login(email, password)).rejects.toThrow('Bcrypt comparison error');

      // Assertions:
      expect(userService.findUserByEmail).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    // Test case: Error during jwt.sign
    it('should throw an error if token generation fails', async () => {
      const mockUser = createMockUser();
      // Configure mocks
      userService.findUserByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      const signError = new Error('JWT signing error');
      jwt.sign.mockImplementation(() => { 
        throw signError;
       }); // Simulate jwt.sign throwing an error

      // Call the service function and expect the error to be re-thrown
      await expect(authService.login(email, password)).rejects.toThrow('JWT signing error');

      // Assertions:
      expect(userService.findUserByEmail).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(jwt.sign).toHaveBeenCalledTimes(1);
    });

    // Test case: User found but password is null or undefined (edge case)
    it('should throw "Invalid credentials" if user is found but password is null or undefined', async () => {
      const mockUserWithoutPassword = {
          id: 1,
          name: 'User without password',
          email,
          password: null, // Password is null
          role: 'student',
      
    };
      userService.findUserByEmail.mockResolvedValue(mockUserWithoutPassword);

      await expect(authService.login(email, password)).rejects.toThrow('Invalid credentials');

      // Assertions:
      expect(userService.findUserByEmail).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).not.toHaveBeenCalled(); // bcrypt.compare should not be called if password is null/undefined
      expect(jwt.sign).not.toHaveBeenCalled();
    });

  });


});
