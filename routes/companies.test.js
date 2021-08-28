"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /companies */

describe("POST /companies", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    logoUrl: "http://new.img",
    description: "DescNew",
    numEmployees: 10,
  };

  test("post: create new company with admin token", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      company: newCompany,
    });
  });

  test("post: create new company with non admin token", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u1Token}`);

    expect(resp.statusCode).toEqual(401);
  });

  test("post: create new company with no token", async function () {
    const resp = await request(app).post("/companies").send(newCompany);

    expect(resp.statusCode).toEqual(401);
  });

  test("post: create company with missing data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        handle: "new",
        numEmployees: 10,
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.statusCode).toEqual(400);
  });

  test("post: create company with invaild data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        ...newCompany,
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /companies */

describe("GET /companies", function () {
  test("get: fetch all companies", async function () {
    const resp = await request(app).get("/companies");
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
      ],
    });
  });

  test("get: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
      .get("/companies")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /companies with name, minEmployees, maxEmployee */

describe("GET /companies with query filters", function () {
  test("get: fetch companies with queries", async function () {
    const resp = await request(app)
      .get("/companies")
      .query({ name: "C", minEmployees: 2, maxEmployees: 3 });

    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
      ],
    });
  });

  test("get: fetch companies with queries (wide min & max values)", async function () {
    const resp = await request(app)
      .get("/companies")
      .query({ minEmployees: 0, maxEmployees: 4 });

    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
      ],
    });
  });

  test("get: fetch companies with queries (negative numbers)", async function () {
    const resp = await request(app)
      .get("/companies")
      .query({ minEmployees: -4, maxEmployees: 1 });

    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
      ],
    });
  });

  test("get: fetch companies with queries (no name)", async function () {
    const resp = await request(app).get("/companies").query({ name: "6" });

    expect(resp.body).toEqual({ companies: [] });
  });

  test("get: fetch companies with queries (min greater than max)", async function () {
    const resp = await request(app)
      .get("/companies")
      .query({ minEmployees: 3, maxEmployees: 2 });

    expect(resp.body).toEqual({
      error: {
        message: "Min value is greater than Max value: Min:3, Max:2",
        status: 400,
      },
    });
  });
});

/************************************** GET /companies/:handle */

describe("GET /companies/:handle", function () {
  test("get: fetch a company with handle", async function () {
    const resp = await request(app).get(`/companies/c1`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
        jobs: [
          {
            companyHandle: "c1",
            equity: 0,
            salary: 50000,
            title: "job1",
          },
        ],
      },
    });
    expect(resp.statusCode).toEqual(200);
  });

  test("get: company not found 404", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /companies/:handle", function () {
  test("patch: update company with admin token", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("patch: update company with non admin token", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("patch: update company with no token", async function () {
    const resp = await request(app).patch(`/companies/c1`).send({
      name: "C1-new",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("patch: company not found 404", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({
        name: "new nope",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("patch: 400 bad request on change handle", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        handle: "c1-new",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("patch: 400 bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /companies/:handle */

describe("DELETE /companies/:handle", function () {
  test("delete: company with admin token", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.body).toEqual({ deleted: "c1" });
  });

  test("delete: company with non admin token", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u1Token}`);

    expect(resp.statusCode).toEqual(401);
  });

  test("delete: company with no token", async function () {
    const resp = await request(app).delete(`/companies/c1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("delete: company not found 404", async function () {
    const resp = await request(app)
      .delete(`/companies/nope`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
