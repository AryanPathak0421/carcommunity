async function run() {
  const res = await fetch('http://localhost:5000/api/labour-categories/grouped');
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

run();
