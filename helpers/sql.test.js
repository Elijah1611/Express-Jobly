const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function () {
  test("works", function () {
    const dataToUpdate = { firstName: 'Aliya', age: 32, logoUrl: 'https://image.jpg' }
    const jsToSql = { firstName: "first_name", logoUrl: "logo_url" }

    const {setCols, values} = sqlForPartialUpdate(dataToUpdate, jsToSql)

    expect(setCols).toEqual("\"first_name\"=$1, \"age\"=$2, \"logo_url\"=$3");
    expect(values).toEqual([ 'Aliya', 32, 'https://image.jpg' ]);
  });
})