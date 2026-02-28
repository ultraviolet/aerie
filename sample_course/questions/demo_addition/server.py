import random


def generate(data):
    a = random.randint(1, 50)
    b = random.randint(1, 50)
    data["params"]["a"] = a
    data["params"]["b"] = b
    data["correct_answers"]["sum"] = a + b


def grade(data):
    submitted = data["submitted_answers"].get("sum")
    expected = data["correct_answers"].get("sum")
    try:
        if float(submitted) == float(expected):
            data["score"] = 1.0
            data["feedback"] = {"message": "Correct!"}
        else:
            data["score"] = 0.0
            data["feedback"] = {"message": f"Incorrect. The correct answer is {expected}."}
    except (TypeError, ValueError):
        data["score"] = 0.0
        data["feedback"] = {"message": "Invalid input. Please enter a number."}
