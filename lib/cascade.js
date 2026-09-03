/**
 * Deleting a User or a Task fails on every child row: the schema (owned by the
 * mobile API) declares no onDelete rules, so Postgres refuses the parent delete.
 * The cascade lives here instead of in the DB.
 *
 * ponytail: app-level cascade, move to onDelete: Cascade if the API repo ever
 * migrates the FKs. scripts/check-cascade.js fails if a new relation appears.
 * Both helpers take a transaction client — call them inside prisma.$transaction.
 */

export async function deleteTasksCascade(tx, where) {
    const ids = (await tx.task.findMany({ where, select: { id: true } })).map((t) => t.id);
    await tx.report.deleteMany({ where: { targetTaskId: { in: ids } } });
    await tx.review.deleteMany({ where: { taskId: { in: ids } } });
    await tx.message.deleteMany({ where: { taskId: { in: ids } } });
    await tx.response.deleteMany({ where: { taskId: { in: ids } } });
    await tx.taskFavorite.deleteMany({ where: { taskId: { in: ids } } });
    await tx.task.deleteMany({ where: { id: { in: ids } } });
    return ids.length;
}

export async function deleteUserCascade(tx, id) {
    // Tasks other people still own, that this user was working on.
    await tx.task.updateMany({ where: { assignedUserId: id }, data: { assignedUserId: null } });
    await deleteTasksCascade(tx, { userId: id });

    await tx.report.deleteMany({ where: { OR: [{ reporterId: id }, { targetUserId: id }] } });
    await tx.review.deleteMany({ where: { OR: [{ reviewerId: id }, { reviewedId: id }] } });
    await tx.message.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } });
    await tx.response.deleteMany({ where: { userId: id } });
    await tx.taskFavorite.deleteMany({ where: { userId: id } });
    await tx.notification.deleteMany({ where: { userId: id } });
    await tx.passwordReset.deleteMany({ where: { userId: id } });
    await tx.payment.deleteMany({ where: { userId: id } });
    await tx.subscription.deleteMany({ where: { userId: id } });
    // Audit trail outlives the account.
    await tx.actionLog.updateMany({ where: { userId: id }, data: { userId: null } });
    // DeviceToken and PushSubscription already cascade in the DB.

    await tx.user.delete({ where: { id } });
}
