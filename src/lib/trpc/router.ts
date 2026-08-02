import { t } from './init';
import { todoRouter } from './routers/todo';
import { categoryRouter } from './routers/category';
import { subtaskRouter } from './routers/subtask';
import { locationRouter } from './routers/location';

export const router = t.router({
	todo: todoRouter,
	category: categoryRouter,
	subtask: subtaskRouter,
	location: locationRouter
});

export type Router = typeof router;