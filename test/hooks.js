exports.mochaHooks = {
  beforeAll(done) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    done();
  },
};
