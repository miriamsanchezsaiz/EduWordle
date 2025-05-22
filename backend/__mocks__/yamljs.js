module.exports = {
    load: jest.fn(() => ({
      info: {
        title: 'Mock API',
        version: '1.0.0',
      },
    })),
  };