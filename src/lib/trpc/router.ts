import { t } from './init';
import { todoRouter } from './routers/todo';
import { categoryRouter } from './routers/category';
import { subtaskRouter } from './routers/subtask';

export const router = t.router({
	todo: todoRouter,
	category: categoryRouter,
	subtask: subtaskRouter
});

export type Router = typeof router;